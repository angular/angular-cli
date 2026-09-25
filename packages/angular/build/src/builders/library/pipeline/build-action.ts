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
import { emitFilesToDisk } from '../../../tools/esbuild/utils';
import { toPosixPath } from '../../../utils/path';
import type { NormalizedEntryPoint, NormalizedLibraryOptions } from '../options';
import { collectAssetsToEmit } from './assets';
import {
  type BundleEntryPointInput,
  type BundleResult,
  type EntryPointLookup,
  bundleEntryPoints,
  createEntryDirectoryLookup,
} from './bundler';
import { type SingleProgramCache, compileLibrary } from './compilation';
import { generatePackageManifests } from './package-manifests';
import type { createComponentStylesheetBundlerForLibrary } from './stylesheet-bundler';
import type { OutputFile } from './utils';

/**
 * State preserved across incremental builds in watch mode.
 */
export interface SingleBuildState {
  singleProgramCache?: SingleProgramCache;
  previousBundleResults: Map<string, BundleResult>;
  pendingChangedEsmFiles: Set<string>;
  pendingChangedDtsFiles: Set<string>;
  hasCompilationError?: boolean;
  hasEmittedManifests?: boolean;
  hasEmittedAssets?: boolean;
  entryDirectoryLookup?: EntryPointLookup;
  directoryExists: Set<string>;
}

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
  options: NormalizedLibraryOptions;
  context: BuilderContext;
  stylesheetBundler: ReturnType<typeof createComponentStylesheetBundlerForLibrary>;
  isWatchMode: boolean;
  allWatchedFiles: Set<string>;
  buildState: SingleBuildState;
  modifiedFiles?: Set<string>;
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
    allWatchedFiles,
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
    Boolean(buildState.hasCompilationError) ||
    pendingChangedEsmFiles.size > 0 ||
    pendingChangedDtsFiles.size > 0 ||
    hasModifiedWatchedFile(modifiedFiles, allWatchedFiles, posixPackageJsonPath);
  const shouldGenerateManifests = !buildState.hasEmittedManifests;

  if (shouldGenerateManifests) {
    verifyAllowedDependencies(options);
  }

  const filesToEmit: OutputFile[] = [];

  if (shouldCompileEntryPoints) {
    buildState.hasCompilationError = true;

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
      allWatchedFiles.add(file);
    }

    for (const file of changedEsmFiles) {
      pendingChangedEsmFiles.add(file);
    }
    for (const file of changedDtsFiles) {
      pendingChangedDtsFiles.add(file);
    }

    const findEntryPoint = (buildState.entryDirectoryLookup ??= createEntryDirectoryLookup(
      options.entryPoints.values(),
    ));
    const itemsToBundle: BundleEntryPointInput[] = [];

    for (const entryPoint of options.entryPoints.values()) {
      const previousBundleResult = buildState.previousBundleResults.get(entryPoint.name);
      const hasEsmChanges =
        !previousBundleResult ||
        hasEntryPointChanges(
          entryPoint,
          previousBundleResult.esmModuleIds,
          findEntryPoint,
          pendingChangedEsmFiles,
        );
      const hasDtsChanges =
        !previousBundleResult ||
        hasEntryPointChanges(
          entryPoint,
          previousBundleResult.dtsModuleIds,
          findEntryPoint,
          pendingChangedDtsFiles,
        );

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
        bundleEntryPoints(itemsToBundle, esmFiles, dtsFiles, options, findEntryPoint),
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

  filesToEmit.push(
    ...(await collectAssetsToEmit(
      options.assets,
      options.workspaceRoot,
      allWatchedFiles,
      buildState.hasEmittedAssets ? modifiedFiles : undefined,
    )),
  );

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
  allWatchedFiles: ReadonlySet<string>,
  posixPackageJsonPath: string,
): boolean {
  for (const file of modifiedFiles) {
    if (file !== posixPackageJsonPath && allWatchedFiles.has(file)) {
      return true;
    }
  }

  return false;
}

function hasEntryPointChanges(
  entryPoint: NormalizedEntryPoint,
  moduleIds: ReadonlySet<string>,
  findEntryPoint: EntryPointLookup,
  changedFiles: ReadonlySet<string>,
): boolean {
  if (changedFiles.size === 0) {
    return false;
  }

  for (const file of changedFiles) {
    if (moduleIds.has(file) || findEntryPoint(file) === entryPoint) {
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
