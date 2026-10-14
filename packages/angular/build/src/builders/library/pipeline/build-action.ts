/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import path from 'node:path';
import type { ComponentStylesheetBundler } from '../../../tools/esbuild/angular/component-stylesheets';
import { deleteFilesFromDisk, emitFilesToDisk } from '../../../utils/disk-files';
import { assertIsError } from '../../../utils/error';
import type { BundleResult, NormalizedLibraryOptions, SingleBuildState } from '../types';
import { type CollectedAssets, collectAssetsToEmit } from './assets';
import { bundleEntryPoints } from './bundler';
import { type LibraryCompilationDiagnostics, compileLibrary } from './compilation';
import { collectEntryPointsToBundle } from './entry-points';
import { generatePackageManifests } from './package-manifests';
import type { OutputFile } from './utils';

/**
 * Result of executing a single library build iteration.
 */
export interface BuildActionResult {
  /** Formatted error messages produced during the build. */
  errors: string[];

  /** Formatted warning messages produced during the build. */
  warnings: string[];

  /** Informational log messages produced during the build. */
  logs: string[];
}

/**
 * Creates a fresh {@link SingleBuildState} instance.
 */
export function createSingleBuildState(): SingleBuildState {
  return {
    previousBundleResults: new Map(),
    pendingChangedEsmFiles: new Set(),
    pendingChangedDtsFiles: new Set(),
    emittedBundleFiles: new Set(),
    emittedManifestFiles: new Set(),
    emittedAssets: new Map(),
  };
}

/**
 * Context required to execute a single library build iteration.
 */
export interface BuildActionContext {
  /** Normalized options for the library build with POSIX paths. */
  options: NormalizedLibraryOptions;

  /** The Architect builder context. */
  context: BuilderContext;

  /** Bundler instance used to process component stylesheets. */
  stylesheetBundler: ComponentStylesheetBundler;

  /** Whether the builder is running in watch mode. */
  isWatchMode: boolean;

  /**
   * Set of POSIX file paths tracked for compilation and configuration
   * (including `tsconfig.json`, `package.json`, entry points, and referenced source,
   * template, and stylesheet files). Updated during compilation and used to determine
   * whether file changes require recompiling entry points, excluding asset files so
   * asset-only changes do not trigger code compilation.
   */
  watchedCompilationFiles: Set<string>;

  /** State preserved across incremental builds in watch mode. */
  buildState: SingleBuildState;

  /** Set of POSIX file paths modified since the last build iteration. */
  modifiedFiles?: Set<string>;

  /**
   * Collected asset changes for the current build iteration.
   * Pre-collected in the watch loop to avoid redundant asset matching, or resolved and
   * populated by `buildAction` when omitted (such as during the initial build) so the
   * caller can register their POSIX source paths with the file watcher.
   */
  collectedAssets?: CollectedAssets;
}

/**
 * Executes a single iteration of the library build pipeline, including
 * single-program Angular compilation, parallel typechecking, 2-instance Rolldown bundling,
 * manifest generation, and asset copying.
 *
 * @param actionContext The build action state and configuration.
 * @returns A promise resolving to the build action result containing errors, warnings, and logs.
 */
export async function buildAction(actionContext: BuildActionContext): Promise<BuildActionResult> {
  const {
    options,
    stylesheetBundler,
    isWatchMode,
    watchedCompilationFiles,
    buildState,
    modifiedFiles,
  } = actionContext;

  const errors: string[] = [];
  const warnings: string[] = [];
  const logs: string[] = [];

  const { packageJsonPath } = options;
  const { pendingChangedEsmFiles, pendingChangedDtsFiles } = buildState;

  if (!modifiedFiles || modifiedFiles.has(packageJsonPath)) {
    buildState.hasEmittedManifests = false;
  }

  const shouldCompileEntryPoints =
    !modifiedFiles ||
    !buildState.singleProgramCache ||
    buildState.hasCompilationError ||
    buildState.hasEntryPointsChanges ||
    pendingChangedEsmFiles.size > 0 ||
    pendingChangedDtsFiles.size > 0 ||
    hasModifiedWatchedFile(modifiedFiles, watchedCompilationFiles, packageJsonPath);

  try {
    if (!buildState.hasEmittedManifests) {
      const dependencyErrors = verifyAllowedDependencies(options);
      if (dependencyErrors.length > 0) {
        errors.push(...dependencyErrors);

        return { errors, warnings, logs };
      }
    }

    const filesToEmit: OutputFile[] = [];
    const filesToDelete = new Set<string>();
    let nextBundleFiles: Set<string> | undefined;
    let nextManifestFiles: Set<string> | undefined;

    if (shouldCompileEntryPoints) {
      const hadEntryPointsChanges = buildState.hasEntryPointsChanges;
      buildState.hasCompilationError = true;
      buildState.hasEntryPointsChanges = false;

      const {
        esmFiles,
        dtsFiles,
        changedEsmFiles,
        changedDtsFiles,
        referencedFiles,
        cache,
        hasStylesheetErrors,
        diagnosePromise,
        declarationMap,
        compilationMode,
      } = await compileLibrary(
        options.entryPoints.values(),
        options,
        stylesheetBundler,
        buildState.singleProgramCache,
        modifiedFiles,
      );
      buildState.singleProgramCache = cache;
      if (buildState.compilationMode !== compilationMode) {
        buildState.compilationMode = compilationMode;
        buildState.hasEmittedManifests = false;
      }

      for (const file of referencedFiles) {
        watchedCompilationFiles.add(file);
      }
      for (const file of changedEsmFiles) {
        pendingChangedEsmFiles.add(file);
      }
      for (const file of changedDtsFiles) {
        pendingChangedDtsFiles.add(file);
      }

      let bundleOutput: Awaited<ReturnType<typeof bundleEntryPoints>> | undefined;
      let diagnostics: LibraryCompilationDiagnostics;
      if (hasStylesheetErrors) {
        diagnostics = await diagnosePromise;
      } else {
        const itemsToBundle = collectEntryPointsToBundle(options, buildState, logs);
        try {
          [bundleOutput, diagnostics] = await Promise.all([
            bundleEntryPoints(itemsToBundle, esmFiles, dtsFiles, {
              ...options,
              declarationMap,
              compilationMode,
            }),
            diagnosePromise,
          ]);
        } catch (error) {
          assertIsError(error);
          // Prioritize TypeScript/Angular diagnostic errors over secondary bundler failures.
          diagnostics = await diagnosePromise;
          if (diagnostics.errors.length === 0) {
            errors.push(error.message);
          }
        }
      }

      warnings.push(...diagnostics.warnings, ...(bundleOutput?.warnings ?? []));
      if (diagnostics.errors.length > 0 || errors.length > 0 || !bundleOutput) {
        errors.push(...diagnostics.errors);

        return { errors, warnings, logs };
      }

      buildState.hasCompilationError = false;
      pendingChangedEsmFiles.clear();
      pendingChangedDtsFiles.clear();

      filesToEmit.push(...bundleOutput.filesToEmit);
      for (const [name, bundleResult] of bundleOutput.bundleResults) {
        buildState.previousBundleResults.set(name, bundleResult);
      }

      if (
        bundleOutput.bundleResults.size > 0 ||
        hadEntryPointsChanges ||
        buildState.emittedBundleFiles.size === 0
      ) {
        nextBundleFiles = collectBundleOutputFiles(
          buildState.previousBundleResults.values(),
          buildState.emittedBundleFiles,
          filesToDelete,
        );
      }
    }

    let hasTslibImport = false;
    for (const entryPoint of options.entryPoints.values()) {
      if (buildState.previousBundleResults.get(entryPoint.name)?.hasTslibImport) {
        hasTslibImport = true;
        break;
      }
    }

    if (!buildState.hasEmittedManifests || buildState.hasEmittedTslib !== hasTslibImport) {
      const manifestFiles = await generatePackageManifests(
        {
          ...options,
          compilationMode: buildState.compilationMode ?? options.compilationMode ?? 'partial',
        },
        isWatchMode,
        hasTslibImport,
      );

      filesToEmit.push(...manifestFiles);

      nextManifestFiles = new Set(manifestFiles.map((file) => file.path));
      for (const prevFile of buildState.emittedManifestFiles) {
        if (!nextManifestFiles.has(prevFile)) {
          filesToDelete.add(prevFile);
        }
      }
    }

    const collectedAssets = (actionContext.collectedAssets ??= await collectAssetsToEmit(
      options.assets,
      options.workspaceRoot,
      buildState.hasEmittedAssets ? modifiedFiles : undefined,
      buildState.emittedAssets,
    ));
    filesToEmit.push(...collectedAssets.filesToEmit);

    await emitFilesToDisk(filesToEmit, (file) => path.posix.join(options.outputPath, file.path));

    updateEmittedAssetState(buildState, collectedAssets, filesToDelete);

    if (filesToDelete.size) {
      await deleteFilesFromDisk(
        Array.from(filesToDelete, (file) => path.join(options.outputPath, file)),
      );
    }

    buildState.emittedBundleFiles = nextBundleFiles ?? buildState.emittedBundleFiles;
    buildState.emittedManifestFiles = nextManifestFiles ?? buildState.emittedManifestFiles;
    buildState.hasEmittedManifests = true;
    buildState.hasEmittedTslib = hasTslibImport;
    buildState.hasEmittedAssets = true;
  } catch (error) {
    assertIsError(error);
    errors.push(error.message);
  }

  return { errors, warnings, logs };
}

/**
 * Collects the active POSIX bundle output file paths across all entry points and queues any
 * previously emitted bundle files that are no longer present for deletion.
 *
 * @param bundleResults Active bundle results across all entry points.
 * @param previousBundleFiles Relative POSIX output paths emitted in the previous build iteration.
 * @param filesToDelete Set of relative POSIX output paths queued for deletion.
 * @returns The new set of active relative POSIX bundle output file paths.
 */
function collectBundleOutputFiles(
  bundleResults: Iterable<BundleResult>,
  previousBundleFiles: ReadonlySet<string>,
  filesToDelete: Set<string>,
): Set<string> {
  const nextBundleFiles = new Set<string>();
  for (const result of bundleResults) {
    if (result.esmOutputFiles) {
      for (const file of result.esmOutputFiles) {
        nextBundleFiles.add(file);
      }
    }
    if (result.dtsOutputFiles) {
      for (const file of result.dtsOutputFiles) {
        nextBundleFiles.add(file);
      }
    }
  }

  for (const prevFile of previousBundleFiles) {
    if (!nextBundleFiles.has(prevFile)) {
      filesToDelete.add(prevFile);
    }
  }

  return nextBundleFiles;
}

/**
 * Updates `buildState.emittedAssets` with newly emitted and deleted assets, queuing any
 * deleted asset POSIX output paths that are not produced by another active asset for removal.
 *
 * @param buildState The state preserved across incremental builds.
 * @param collectedAssets The collected asset files to emit and delete.
 * @param filesToDelete Set of relative POSIX output paths queued for deletion.
 */
function updateEmittedAssetState(
  buildState: SingleBuildState,
  collectedAssets: CollectedAssets,
  filesToDelete: Set<string>,
): void {
  const emittedAssets = buildState.emittedAssets;
  const toDelete = collectedAssets.filesToDelete;
  const toEmit = collectedAssets.filesToEmit;

  for (const deletedAsset of toDelete) {
    emittedAssets.delete(deletedAsset.source);
  }

  for (const emittedAsset of toEmit) {
    emittedAssets.set(emittedAsset.source, emittedAsset.path);
  }

  if (toDelete.length) {
    const activeAssetOutputs = new Set(emittedAssets.values());

    for (const deletedAsset of toDelete) {
      if (!activeAssetOutputs.has(deletedAsset.path)) {
        filesToDelete.add(deletedAsset.path);
      }
    }
  }
}

/**
 * Checks whether any modified file (excluding `package.json`) is part of the
 * tracked compilation file set.
 *
 * @param modifiedFiles Set of POSIX file paths modified since the last build.
 * @param watchedCompilationFiles Set of POSIX file paths tracked for compilation.
 * @param packageJsonPath The normalized POSIX path to the library's `package.json`.
 * @returns `true` if a watched compilation file was modified; otherwise `false`.
 */
export function hasModifiedWatchedFile(
  modifiedFiles: ReadonlySet<string>,
  watchedCompilationFiles: ReadonlySet<string>,
  packageJsonPath: string,
): boolean {
  for (const file of modifiedFiles) {
    if (file !== packageJsonPath && watchedCompilationFiles.has(file)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates that all direct and optional dependencies in `package.json` are
 * permitted by `allowedNonPeerDependencies`.
 *
 * @param options The normalized library builder options.
 * @returns An array of error messages for any disallowed dependencies.
 */
function verifyAllowedDependencies(options: NormalizedLibraryOptions): string[] {
  const { packageJson, allowedNonPeerDependencies } = options;
  const dependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.optionalDependencies ?? {}),
  };

  const errors: string[] = [];
  for (const dep of Object.keys(dependencies)) {
    if (!allowedNonPeerDependencies.some((regex) => regex.test(dep))) {
      errors.push(
        `Dependency '${dep}' must be explicitly allowed using the 'allowedNonPeerDependencies' option, ` +
          `or moved to 'peerDependencies' in 'package.json'.`,
      );
    }
  }

  return errors;
}
