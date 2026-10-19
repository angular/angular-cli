/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import type { ComponentStylesheetBundler } from '../../../tools/esbuild/angular/component-stylesheets';
import { deleteFilesFromDisk, emitFilesToDisk } from '../../../utils/disk-files';
import { assertIsError } from '../../../utils/error';
import type { BuilderState } from '../builder-state';
import type { ExecutionResult } from '../execution-result';
import type { NormalizedLibraryOptions } from '../types';
import type { CollectedAssets } from './assets';
import { type BundleEntryPointsOutput, bundleEntryPoints } from './bundler';
import { compileLibrary } from './compilation';
import { collectEntryPointsToBundle } from './entry-points';
import { generatePackageManifests } from './package-manifests';
import type { OutputFile } from './utils';

/**
 * Context required to execute a single library build iteration.
 */
export interface BuildActionContext {
  /** Normalized options for the library build with POSIX paths. */
  options: NormalizedLibraryOptions;

  /** Bundler instance used to process component stylesheets. */
  stylesheetBundler: ComponentStylesheetBundler;

  /** Whether the builder is running in watch mode. */
  isWatchMode: boolean;

  /** Build state tracking compilation caches, file references, and emitted outputs. */
  buildState: BuilderState;

  /** Set of POSIX file paths modified since the last build iteration. */
  modifiedFiles?: Set<string>;

  /**
   * Collected asset changes for the current build iteration.
   * Pre-collected in the watch loop to avoid redundant asset matching, or resolved by
   * `buildAction` when omitted (such as during the initial build).
   */
  collectedAssets?: CollectedAssets;
}

/**
 * Executes a single iteration of the library build pipeline, including
 * single-program Angular compilation, parallel typechecking, 2-instance Rolldown bundling,
 * manifest generation, and asset copying.
 *
 * @param actionContext The build action state and configuration.
 * @returns A promise resolving to the build iteration's `ExecutionResult`.
 */
export async function buildAction(actionContext: BuildActionContext): Promise<ExecutionResult> {
  const { options, stylesheetBundler, isWatchMode, buildState, modifiedFiles } = actionContext;
  const result = buildState.resetExecutionResult();

  const { packageJsonPath } = options;

  const shouldCompileEntryPoints = buildState.shouldCompileEntryPoints(
    packageJsonPath,
    modifiedFiles,
  );

  try {
    if (!buildState.hasEmittedManifests && !verifyAllowedDependencies(options, result)) {
      return result;
    }

    const filesToEmit: OutputFile[] = [];

    if (shouldCompileEntryPoints) {
      buildState.hasCompilationError = true;

      const compilationOutput = await compileLibrary(
        options,
        stylesheetBundler,
        buildState,
        buildState.getCompilationModifiedFiles(modifiedFiles),
      );
      buildState.recordCompilationOutput(compilationOutput);

      const {
        esmFiles,
        dtsFiles,
        hasStylesheetErrors,
        diagnosePromise,
        declarationMap,
        compilationMode,
      } = compilationOutput;

      if (hasStylesheetErrors) {
        await diagnosePromise;

        return result;
      }

      const itemsToBundle = collectEntryPointsToBundle(options, buildState);
      let bundleOutput: BundleEntryPointsOutput;
      try {
        [bundleOutput] = await Promise.all([
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
        await diagnosePromise;
        if (!result.hasErrors) {
          result.addError(error.message);
        }

        return result;
      }

      result.addWarnings(bundleOutput.warnings);
      if (result.hasErrors) {
        return result;
      }

      filesToEmit.push(...bundleOutput.filesToEmit);
      buildState.recordBundleOutput(bundleOutput.bundleResults);
    }

    let manifestFiles: OutputFile[] | undefined;
    const { hasTslibImport } = buildState;
    if (!buildState.hasEmittedManifests || buildState.hasEmittedTslib !== hasTslibImport) {
      manifestFiles = await generatePackageManifests(
        {
          ...options,
          compilationMode: buildState.compilationMode ?? options.compilationMode ?? 'partial',
        },
        isWatchMode,
        hasTslibImport,
      );

      filesToEmit.push(...manifestFiles);
    }

    const collectedAssets =
      actionContext.collectedAssets ?? (await buildState.collectAssets(options, modifiedFiles));
    filesToEmit.push(...collectedAssets.filesToEmit);

    await emitFilesToDisk(filesToEmit, (file) => path.posix.join(options.outputPath, file.path));

    const filesToDelete = buildState.recordEmittedOutputs(collectedAssets, manifestFiles);

    if (filesToDelete.size) {
      await deleteFilesFromDisk(
        Array.from(filesToDelete, (file) => path.posix.join(options.outputPath, file)),
      );
    }
  } catch (error) {
    assertIsError(error);
    result.addError(error.message);
  }

  return result;
}

/**
 * Validates that all direct and optional dependencies in `package.json` are
 * permitted by `allowedNonPeerDependencies`.
 *
 * @param options The normalized library builder options.
 * @param result The execution result to record any disallowed dependency errors into.
 * @returns `true` if all dependencies are allowed; otherwise `false`.
 */
function verifyAllowedDependencies(
  options: NormalizedLibraryOptions,
  result: ExecutionResult,
): boolean {
  const { packageJson, allowedNonPeerDependencies } = options;
  const dependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.optionalDependencies ?? {}),
  };

  let isValid = true;
  for (const dep of Object.keys(dependencies)) {
    if (!allowedNonPeerDependencies.some((regex) => regex.test(dep))) {
      result.addError(
        `Dependency '${dep}' must be explicitly allowed using the 'allowedNonPeerDependencies' option, ` +
          `or moved to 'peerDependencies' in 'package.json'.`,
      );
      isValid = false;
    }
  }

  return isValid;
}
