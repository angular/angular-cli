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
import { emitFilesToDisk } from '../../../utils/emit-files-to-disk';
import { assertIsError } from '../../../utils/error';
import { toPosixPath } from '../../../utils/path';
import type { NormalizedLibraryOptions, SingleBuildState } from '../types';
import { collectAssetsToEmit } from './assets';
import { bundleEntryPoints } from './bundler';
import { type LibraryCompilationDiagnostics, compileLibrary } from './compilation';
import { collectEntryPointsToBundle } from './entry-points';
import { generatePackageManifests } from './package-manifests';
import type { DiskOutputFile, OutputFile } from './utils';

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
  };
}

/**
 * Context required to execute a single library build iteration.
 */
export interface BuildActionContext {
  /** Normalized options for the library build. */
  options: NormalizedLibraryOptions;

  /** The Architect builder context. */
  context: BuilderContext;

  /** Bundler instance used to process component stylesheets. */
  stylesheetBundler: ComponentStylesheetBundler;

  /** Whether the builder is running in watch mode. */
  isWatchMode: boolean;

  /**
   * Set of file paths tracked for compilation and configuration
   * (including `tsconfig.json`, `package.json`, entry points, and referenced source,
   * template, and stylesheet files). Updated during compilation and used to determine
   * whether file changes require recompiling entry points, excluding asset files so
   * asset-only changes do not trigger code compilation.
   */
  watchedCompilationFiles: Set<string>;

  /** State preserved across incremental builds in watch mode. */
  buildState: SingleBuildState;

  /** Set of file paths modified since the last build iteration. */
  modifiedFiles?: Set<string>;

  /**
   * Asset files to emit to disk for the current build iteration.
   * Pre-collected in the watch loop to avoid redundant asset matching, or resolved and
   * populated by `buildAction` when omitted (such as during the initial build) so the
   * caller can register their source paths with the file watcher.
   */
  assetsToEmit?: DiskOutputFile[];
}

/**
 * Executes a single iteration of the library build pipeline, including
 * single-program Angular compilation, parallel typechecking, 2-instance Rolldown bundling,
 * manifest generation, and asset copying.
 *
 * @param actionContext The build action state and configuration.
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

  const posixPackageJsonPath = toPosixPath(options.packageJsonPath);
  const { pendingChangedEsmFiles, pendingChangedDtsFiles } = buildState;

  if (!modifiedFiles || modifiedFiles.has(posixPackageJsonPath)) {
    buildState.hasEmittedManifests = false;
  }

  const shouldCompileEntryPoints =
    !modifiedFiles ||
    !buildState.singleProgramCache ||
    buildState.hasCompilationError ||
    buildState.hasEntryPointsChanges ||
    pendingChangedEsmFiles.size > 0 ||
    pendingChangedDtsFiles.size > 0 ||
    hasModifiedWatchedFile(modifiedFiles, watchedCompilationFiles, posixPackageJsonPath);

  try {
    if (!buildState.hasEmittedManifests) {
      const dependencyErrors = verifyAllowedDependencies(options);
      if (dependencyErrors.length > 0) {
        errors.push(...dependencyErrors);

        return { errors, warnings, logs };
      }
    }

    const filesToEmit: OutputFile[] = [];

    if (shouldCompileEntryPoints) {
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

      const itemsToBundle = collectEntryPointsToBundle(options, buildState, logs);

      let bundleOutput: Awaited<ReturnType<typeof bundleEntryPoints>> | undefined;
      let diagnostics: LibraryCompilationDiagnostics;
      if (hasStylesheetErrors) {
        diagnostics = await diagnosePromise;
      } else {
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
    }

    let hasTslibImport = false;
    for (const entryPoint of options.entryPoints.values()) {
      if (buildState.previousBundleResults.get(entryPoint.name)?.hasTslibImport) {
        hasTslibImport = true;
        break;
      }
    }

    if (!buildState.hasEmittedManifests || buildState.hasEmittedTslib !== hasTslibImport) {
      filesToEmit.push(
        ...(await generatePackageManifests(
          {
            ...options,
            compilationMode: buildState.compilationMode ?? options.compilationMode ?? 'partial',
          },
          isWatchMode,
          hasTslibImport,
        )),
      );
    }

    const resolvedAssetsToEmit = (actionContext.assetsToEmit ??= await collectAssetsToEmit(
      options.assets,
      options.workspaceRoot,
      buildState.hasEmittedAssets ? modifiedFiles : undefined,
    ));
    filesToEmit.push(...resolvedAssetsToEmit);

    await emitFilesToDisk(filesToEmit, (file) => path.join(options.outputPath, file.path));

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
 * Checks whether any modified file (excluding `package.json`) is part of the
 * tracked compilation file set.
 *
 * @param modifiedFiles Set of POSIX file paths modified since the last build.
 * @param watchedCompilationFiles Set of POSIX file paths tracked for compilation.
 * @param posixPackageJsonPath The normalized POSIX path to the library's `package.json`.
 * @returns `true` if a watched compilation file was modified; otherwise `false`.
 */
export function hasModifiedWatchedFile(
  modifiedFiles: ReadonlySet<string>,
  watchedCompilationFiles: ReadonlySet<string>,
  posixPackageJsonPath: string,
): boolean {
  for (const file of modifiedFiles) {
    if (file !== posixPackageJsonPath && watchedCompilationFiles.has(file)) {
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
