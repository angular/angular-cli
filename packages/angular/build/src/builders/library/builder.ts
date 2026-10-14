/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import type { logging } from '@angular-devkit/core';
import {
  resetSassWorkerPoolCaches,
  shutdownSassWorkerPool,
} from '../../tools/esbuild/stylesheets/sass-language';
import { transformSupportedBrowsersToTargets } from '../../tools/esbuild/target';
import { withNoProgress, withSpinner } from '../../tools/esbuild/utils';
import { deleteOutputDir } from '../../utils/delete-output-dir';
import { assertIsError } from '../../utils/error';
import { initializeHash } from '../../utils/hash';
import { toPosixPath } from '../../utils/path';
import { logCumulativeDurations } from '../../utils/profiling';
import { purgeStaleBuildCache } from '../../utils/purge-cache';
import { getSupportedBrowsers } from '../../utils/supported-browsers';
import { assertCompatibleAngularVersion } from '../../utils/version';
import type { BuildWatcher } from '../../utils/watcher';
import { normalizeLibraryOptions } from './options';
import type { BuildActionResult } from './pipeline/build-action';
import { updateWatchedEntryPoints } from './pipeline/entry-points';
import type { createComponentStylesheetBundlerForLibrary } from './pipeline/stylesheet-bundler';
import { loadPackageJson } from './pipeline/utils';
import type { Schema as LibraryBuilderOptions } from './schema';
import type { NormalizedLibraryOptions, SingleBuildState } from './types';

/**
 * Executes the library builder to compile, bundle, and package an Angular library into the Angular Package Format (APF).
 *
 * @param options The raw builder schema options.
 * @param context The architect builder execution context.
 * @returns An async iterator yielding builder output results.
 */
export async function* executeLibraryBuilder(
  options: LibraryBuilderOptions,
  context: BuilderContext & { signal?: AbortSignal },
): AsyncIterableIterator<BuilderOutput> {
  assertCompatibleAngularVersion(context.workspaceRoot);

  const projectName = context.target?.project;
  if (!projectName) {
    yield { success: false, error: 'The library builder requires a target.' };

    return;
  }

  const [normalizedOptions] = await Promise.all([
    normalizeLibraryOptions(context, projectName, options),
    initializeHash(),
    // Purge old build disk cache
    purgeStaleBuildCache(context),
  ]);

  const {
    workspaceRoot,
    projectRoot,
    outputPath,
    deleteOutputPath,
    packageJsonPath,
    tsConfigPath,
    watch: isWatchMode,
    poll,
    cacheOptions,
    preserveSymlinks,
    progress,
  } = normalizedOptions;

  let signal = context.signal;
  if (!signal) {
    const controller = new AbortController();
    signal = controller.signal;
    context.addTeardown?.(() => controller.abort('builder-teardown'));
  }

  const { logger } = context;

  const withProgress: typeof withSpinner = progress ? withSpinner : withNoProgress;

  // Clean output directory
  if (deleteOutputPath) {
    await deleteOutputDir(workspaceRoot, outputPath);
  }

  // Dynamically lazy-loaded to prevent importing dependencies at the top level.
  const [
    { buildAction, createSingleBuildState, hasModifiedWatchedFile },
    { createComponentStylesheetBundlerForLibrary },
  ] = await Promise.all([
    import('./pipeline/build-action'),
    import('./pipeline/stylesheet-bundler'),
  ]);

  let stylesheetBundler: ReturnType<typeof createComponentStylesheetBundlerForLibrary> | undefined;
  let watcher: BuildWatcher | undefined;
  const buildState = createSingleBuildState();

  try {
    const browsers = getSupportedBrowsers(projectRoot, logger);
    const target = transformSupportedBrowsersToTargets(browsers);
    stylesheetBundler = createComponentStylesheetBundlerForLibrary(
      normalizedOptions,
      isWatchMode,
      target,
    );

    // Track all referenced compilation files for watch mode
    const watchedCompilationFiles = new Set<string>([tsConfigPath, packageJsonPath]);

    for (const entryPoint of normalizedOptions.entryPoints.values()) {
      watchedCompilationFiles.add(entryPoint.entryFilePath);
    }

    if (isWatchMode) {
      const { setupWatcher } = await import('../../utils/watcher');
      watcher = await setupWatcher({
        workspaceRoot,
        projectRoot,
        outputPath,
        cacheOptions,
        poll,
        preserveSymlinks,
        signal,
        watchFiles: [
          ...watchedCompilationFiles,
          ...normalizedOptions.assets.map((asset) => asset.input),
        ],
      });

      context.addTeardown?.(() => void watcher?.close());
    }

    // Execute initial build
    const initialResult = await executeBuild(
      'Building...',
      {
        options: normalizedOptions,
        stylesheetBundler,
        watchedCompilationFiles,
        isWatchMode,
        context,
        buildState,
      },
      withProgress,
      watcher,
      buildAction,
    );

    if (isWatchMode && progress) {
      logger.info('Watch mode enabled. Watching for file changes...');
    }

    yield initialResult;

    if (!isWatchMode || !watcher) {
      return;
    }

    yield* runWatchLoop(
      watcher,
      normalizedOptions,
      stylesheetBundler,
      watchedCompilationFiles,
      context,
      withProgress,
      buildState,
      buildAction,
      hasModifiedWatchedFile,
      signal,
    );
  } finally {
    logCumulativeDurations();
    shutdownSassWorkerPool();

    await Promise.allSettled([
      watcher?.close(),
      stylesheetBundler?.dispose(),
      buildState.singleProgramCache?.compilationInstance.close?.(),
    ]);
  }
}

/**
 * Executes a single build iteration with progress reporting, logs any resulting
 * messages, and registers newly discovered files with the watcher.
 *
 * @param message Progress spinner message to display while building.
 * @param actionContext The build action context and state.
 * @param withProgress Progress wrapper function (`withSpinner` or `withNoProgress`).
 * @param watcher Optional file watcher for watch mode.
 * @param buildAction The library build action function to execute.
 * @returns A promise resolving to the Architect `BuilderOutput`.
 */
async function executeBuild(
  message: string,
  actionContext: import('./pipeline/build-action').BuildActionContext,
  withProgress: typeof withSpinner,
  watcher: BuildWatcher | undefined,
  buildAction: typeof import('./pipeline/build-action').buildAction,
): Promise<BuilderOutput> {
  const startTime = process.hrtime.bigint();
  const { context, watchedCompilationFiles, isWatchMode, options } = actionContext;

  try {
    const result = await withProgress(message, () => buildAction(actionContext));
    logMessages(context.logger, result);

    const success = result.errors.length === 0;
    logBuildResult(context.logger, startTime, success, options.outputPath);
    if (success && isWatchMode) {
      logCumulativeDurations();
    }

    return { success };
  } catch (error) {
    assertIsError(error);
    logBuildResult(context.logger, startTime, false);

    return { success: false, error: error.message };
  } finally {
    if (watcher) {
      watcher.add(Array.from(watchedCompilationFiles));

      const { collectedAssets } = actionContext;
      if (collectedAssets?.filesToEmit.length) {
        watcher.add(collectedAssets.filesToEmit.map((asset) => asset.source));
      }
    }
  }
}

/**
 * Runs the watch loop, rebuilding the library as watched files are modified.
 *
 * @param watcher The file watcher instance.
 * @param options The normalized library builder options with POSIX paths.
 * @param stylesheetBundler The component stylesheet bundler instance.
 * @param watchedCompilationFiles Set of POSIX file paths tracked for compilation.
 * @param context The Architect builder context.
 * @param withProgress Progress wrapper function (`withSpinner` or `withNoProgress`).
 * @param buildState The state preserved across incremental builds.
 * @param buildAction The library build action function to execute.
 * @param hasModifiedWatchedFile Helper to check whether watched compilation files changed.
 * @param signal Optional abort signal to terminate the watch loop.
 */
async function* runWatchLoop(
  watcher: BuildWatcher,
  options: NormalizedLibraryOptions,
  stylesheetBundler: ReturnType<typeof createComponentStylesheetBundlerForLibrary>,
  watchedCompilationFiles: Set<string>,
  context: BuilderContext,
  withProgress: typeof withSpinner,
  buildState: SingleBuildState,
  buildAction: typeof import('./pipeline/build-action').buildAction,
  hasModifiedWatchedFile: typeof import('./pipeline/build-action').hasModifiedWatchedFile,
  signal?: AbortSignal,
): AsyncIterableIterator<BuilderOutput> {
  const { collectAssetsToEmit } = await import('./pipeline/assets');

  const { workspaceRoot, packageJsonPath, assets, clearScreen } = options;

  for await (const changes of watcher) {
    if (signal?.aborted) {
      break;
    }

    if (clearScreen) {
      // eslint-disable-next-line no-console
      console.clear();
    }

    const changedFiles = new Set<string>();
    let hasStyleChanges = false;
    let hasSassChanges = false;
    for (const file of changes.all) {
      const posixFile = toPosixPath(file);
      changedFiles.add(posixFile);
      if (/\.(?:scss|sass)$/i.test(posixFile)) {
        hasStyleChanges = true;
        hasSassChanges = true;
      } else if (/\.(?:less|css)$/i.test(posixFile)) {
        hasStyleChanges = true;
      }
    }

    if (hasStyleChanges) {
      if (hasSassChanges) {
        resetSassWorkerPoolCaches();
      }
      const invalidatedStyles = stylesheetBundler.invalidate(changedFiles);
      if (invalidatedStyles) {
        for (const styleFile of invalidatedStyles) {
          changedFiles.add(toPosixPath(styleFile));
        }
      }
    }

    // Check if package.json was modified
    let hasPackageJsonChanges = false;
    if (changedFiles.has(packageJsonPath)) {
      try {
        const packageJson = await loadPackageJson(packageJsonPath);
        if (!packageJson.name) {
          throw new Error(`The package.json at '${packageJsonPath}' must contain a 'name'.`);
        }
        options.packageJson = packageJson;
        options.packageName = packageJson.name;

        updateWatchedEntryPoints(
          packageJson,
          options,
          buildState,
          watchedCompilationFiles,
          packageJsonPath,
        );

        hasPackageJsonChanges = true;
      } catch (error) {
        assertIsError(error);
        await buildState.singleProgramCache?.compilationInstance.update?.(changedFiles);
        buildState.hasEmittedManifests = false;

        yield {
          success: false,
          error: `Failed to reload 'package.json': ${error.message}`,
        };
        continue;
      }
    }

    const hasSourceChanges =
      !buildState.singleProgramCache ||
      buildState.hasCompilationError ||
      buildState.hasEntryPointsChanges ||
      hasModifiedWatchedFile(changedFiles, watchedCompilationFiles, packageJsonPath);

    const collectedAssets = await collectAssetsToEmit(
      assets,
      workspaceRoot,
      buildState.hasEmittedAssets ? changedFiles : undefined,
      buildState.emittedAssets,
    );

    if (
      !hasSourceChanges &&
      !hasPackageJsonChanges &&
      collectedAssets.filesToEmit.length === 0 &&
      collectedAssets.filesToDelete.length === 0
    ) {
      continue;
    }

    yield await executeBuild(
      'Changes detected. Rebuilding...',
      {
        options,
        stylesheetBundler,
        watchedCompilationFiles,
        isWatchMode: true,
        context,
        buildState,
        modifiedFiles: changedFiles,
        collectedAssets,
      },
      withProgress,
      watcher,
      buildAction,
    );
  }
}

/**
 * Logs informational, warning, and error messages produced during a build iteration.
 *
 * @param logger The Architect logger API.
 * @param result The build action result containing logs, warnings, and errors.
 */
function logMessages(
  logger: logging.LoggerApi,
  { logs, warnings, errors }: BuildActionResult,
): void {
  if (logs.length) {
    logger.info(logs.join('\n'));
  }

  if (warnings.length) {
    logger.warn(warnings.join('\n'));
  }

  if (errors.length) {
    logger.error(errors.join('\n'));
  }
}

/**
 * Logs the build completion time and status.
 *
 * @param logger The Architect logger API.
 * @param startTime High-resolution timestamp recorded when the build iteration started.
 * @param success Whether the build iteration succeeded without errors.
 * @param outputPath Optional POSIX output directory path to log on successful builds.
 */
function logBuildResult(
  logger: logging.LoggerApi,
  startTime: bigint,
  success: boolean,
  outputPath?: string,
): void {
  const buildTime = Number(process.hrtime.bigint() - startTime) / 10 ** 9;
  const message =
    `Library bundle generation ${success ? 'complete' : 'failed'}.` +
    ` [${buildTime.toFixed(3)} seconds] - ${new Date().toISOString()}`;

  if (success) {
    logger.info(message);
    if (outputPath) {
      logger.info(`Output location: ${outputPath}\n`);
    }
  } else {
    logger.error(message);
  }
}
