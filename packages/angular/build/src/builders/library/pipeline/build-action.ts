/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import { constants, copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ComponentStylesheetBundler } from '../../../tools/esbuild/angular/component-stylesheets';
import { emitFilesToDisk } from '../../../tools/esbuild/utils';
import { toPosixPath } from '../../../utils/path';
import type { NormalizedLibraryOptions, SingleBuildState } from '../types';
import { collectAssetsToEmit } from './assets';
import { type BundleEntryPointInput, bundleEntryPoints } from './bundler';
import { compileLibrary } from './compilation';
import { generatePackageManifests } from './package-manifests';
import type { DiskOutputFile, OutputFile } from './utils';

/**
 * Creates a fresh {@link SingleBuildState} instance.
 */
export function createSingleBuildState(): SingleBuildState {
  return {
    previousBundleResults: new Map(),
    pendingChangedEsmFiles: new Set(),
    pendingChangedDtsFiles: new Set(),
    directoryExists: new Set(),
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
export async function buildAction(actionContext: BuildActionContext): Promise<void> {
  const {
    options,
    context,
    stylesheetBundler,
    isWatchMode,
    watchedCompilationFiles,
    buildState,
    modifiedFiles,
  } = actionContext;

  const posixPackageJsonPath = toPosixPath(options.packageJsonPath);
  const { pendingChangedEsmFiles, pendingChangedDtsFiles, directoryExists } = buildState;

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
  const shouldGenerateManifests = !buildState.hasEmittedManifests;

  if (shouldGenerateManifests) {
    verifyAllowedDependencies(options);
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
      diagnosePromise,
    } = await compileLibrary(
      options.entryPoints.values(),
      options,
      stylesheetBundler,
      buildState.singleProgramCache,
      modifiedFiles,
    );
    buildState.singleProgramCache = cache;

    for (const file of referencedFiles) {
      watchedCompilationFiles.add(file);
    }

    for (const file of changedEsmFiles) {
      pendingChangedEsmFiles.add(file);
    }
    for (const file of changedDtsFiles) {
      pendingChangedDtsFiles.add(file);
    }

    const itemsToBundle: BundleEntryPointInput[] = [];

    for (const entryPoint of options.entryPoints.values()) {
      const previousBundleResult = buildState.previousBundleResults.get(entryPoint.name);
      const hasEsmChanges =
        !previousBundleResult ||
        hasEntryPointChanges(previousBundleResult.esmModuleIds, pendingChangedEsmFiles);
      const hasDtsChanges =
        !previousBundleResult ||
        hasEntryPointChanges(previousBundleResult.dtsModuleIds, pendingChangedDtsFiles);

      if (hasEsmChanges || hasDtsChanges) {
        context.logger.info(`Compiling ${entryPoint.displayName}...`);
        itemsToBundle.push({
          entryPoint,
          hasEsmChanges,
          hasDtsChanges,
          previousBundleResult,
        });
      }
    }

    let bundleOutput: Awaited<ReturnType<typeof bundleEntryPoints>>;
    let warnings: string[];
    try {
      [bundleOutput, warnings] = await Promise.all([
        bundleEntryPoints(itemsToBundle, esmFiles, dtsFiles, options),
        diagnosePromise,
      ]);
    } catch (error) {
      // Prioritize TypeScript/Angular diagnostic errors over secondary bundler failures.
      await diagnosePromise;
      throw error;
    }

    buildState.hasCompilationError = false;
    pendingChangedEsmFiles.clear();
    pendingChangedDtsFiles.clear();

    for (const warning of warnings) {
      context.logger.warn(warning);
    }

    filesToEmit.push(...bundleOutput.filesToEmit);
    for (const [name, bundleResult] of bundleOutput.bundleResults) {
      buildState.previousBundleResults.set(name, bundleResult);
    }
  }

  if (shouldGenerateManifests) {
    filesToEmit.push(...generatePackageManifests(options, isWatchMode));
  }

  const resolvedAssetsToEmit = (actionContext.assetsToEmit ??= await collectAssetsToEmit(
    options.assets,
    options.workspaceRoot,
    buildState.hasEmittedAssets ? modifiedFiles : undefined,
  ));
  filesToEmit.push(...resolvedAssetsToEmit);

  await emitFilesToDisk<OutputFile>(filesToEmit, async (file) => {
    const fullFilePath = path.join(options.outputPath, file.path);
    const fileBasePath = path.dirname(fullFilePath);
    if (fileBasePath && !directoryExists.has(fileBasePath)) {
      await mkdir(fileBasePath, { recursive: true });
      directoryExists.add(fileBasePath);
    }

    if (file.type === 'memory') {
      await writeFile(fullFilePath, file.contents);
    } else {
      await copyFile(file.source, fullFilePath, constants.COPYFILE_FICLONE);
    }
  });

  buildState.hasEmittedManifests = true;
  buildState.hasEmittedAssets = true;
}

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

function hasEntryPointChanges(
  moduleIds: ReadonlySet<string>,
  changedFiles: ReadonlySet<string>,
): boolean {
  if (changedFiles.size === 0) {
    return false;
  }

  for (const file of changedFiles) {
    if (moduleIds.has(file)) {
      return true;
    }
  }

  return false;
}

function verifyAllowedDependencies(options: NormalizedLibraryOptions): void {
  const { packageJson, allowedNonPeerDependencies } = options;
  const dependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.optionalDependencies ?? {}),
  };

  for (const dep of Object.keys(dependencies)) {
    if (!allowedNonPeerDependencies.some((regex) => regex.test(dep))) {
      throw new Error(
        `Dependency '${dep}' must be explicitly allowed using the 'allowedNonPeerDependencies' option, ` +
          `or moved to 'peerDependencies' in 'package.json'.`,
      );
    }
  }
}
