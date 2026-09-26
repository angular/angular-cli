/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import type { logging } from '@angular-devkit/core';
import fs from 'node:fs/promises';
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
import {
  type NormalizedLibraryOptions,
  type PackageJsonData,
  normalizeLibraryOptions,
} from './options';
import type { SingleBuildState } from './pipeline/build-action';
import type { createComponentStylesheetBundlerForLibrary } from './pipeline/stylesheet-bundler';
import type { Schema as LibraryBuilderOptions } from './schema';

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
  await initializeHash();

  // Purge old build disk cache
  await purgeStaleBuildCache(context);

  const projectName = context.target?.project;
  if (!projectName) {
    yield { success: false, error: 'The library builder requires a target.' };

    return;
  }

  const normalizedOptions = await normalizeLibraryOptions(context, projectName, options);
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

    // Track all referenced files for watch mode
    const allWatchedFiles = new Set<string>([
      toPosixPath(tsConfigPath),
      toPosixPath(packageJsonPath),
    ]);

    for (const entryPoint of normalizedOptions.entryPoints.values()) {
      allWatchedFiles.add(toPosixPath(entryPoint.entryFilePath));
    }

    if (isWatchMode) {
      if (progress) {
        logger.info('Watch mode enabled. Watching for file changes...');
      }

      const { setupWatcher } = await import('../../utils/watcher');
      watcher = await setupWatcher({
        workspaceRoot,
        projectRoot,
        outputPath,
        cacheOptions,
        poll,
        preserveSymlinks,
        signal,
        watchFiles: allWatchedFiles,
      });

      context.addTeardown?.(() => void watcher?.close());
    }

    // Execute initial build
    const initialResult = await executeBuild(
      'Building...',
      {
        options: normalizedOptions,
        stylesheetBundler,
        allWatchedFiles,
        isWatchMode,
        context,
        buildState,
      },
      withProgress,
      watcher,
      buildAction,
    );
    yield initialResult;

    if (!isWatchMode || !watcher) {
      return;
    }

    yield* runWatchLoop(
      watcher,
      normalizedOptions,
      stylesheetBundler,
      allWatchedFiles,
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

async function executeBuild(
  message: string,
  actionContext: import('./pipeline/build-action').BuildActionContext,
  withProgress: typeof withSpinner,
  watcher: BuildWatcher | undefined,
  buildAction: typeof import('./pipeline/build-action').buildAction,
): Promise<BuilderOutput> {
  const startTime = process.hrtime.bigint();
  const { context, allWatchedFiles, isWatchMode } = actionContext;

  try {
    await withProgress(message, () => buildAction(actionContext));
    logBuildResult(context.logger, startTime, true);
    if (isWatchMode) {
      logCumulativeDurations();
    }

    return { success: true };
  } catch (error) {
    assertIsError(error);
    logBuildResult(context.logger, startTime, false);

    return { success: false, error: error.message };
  } finally {
    watcher?.add(Array.from(allWatchedFiles));
  }
}

/**
 * Runs the watch loop, rebuilding the library as watched files are modified.
 */
async function* runWatchLoop(
  watcher: BuildWatcher,
  options: NormalizedLibraryOptions,
  stylesheetBundler: ReturnType<typeof createComponentStylesheetBundlerForLibrary>,
  allWatchedFiles: Set<string>,
  context: BuilderContext,
  withProgress: typeof withSpinner,
  buildState: SingleBuildState,
  buildAction: typeof import('./pipeline/build-action').buildAction,
  hasModifiedWatchedFile: typeof import('./pipeline/build-action').hasModifiedWatchedFile,
  signal?: AbortSignal,
): AsyncIterableIterator<BuilderOutput> {
  const { checkAssetChanges } = await import('./pipeline/assets');

  const { workspaceRoot, packageJsonPath, assets, clearScreen } = options;
  const posixPackageJsonPath = toPosixPath(packageJsonPath);

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
    if (changedFiles.has(posixPackageJsonPath)) {
      try {
        const packageJson = await loadPackageJson(packageJsonPath);
        options.packageJson = packageJson;
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
      Boolean(buildState.hasCompilationError) ||
      hasModifiedWatchedFile(changedFiles, allWatchedFiles, posixPackageJsonPath);

    if (
      !hasSourceChanges &&
      !hasPackageJsonChanges &&
      !checkAssetChanges(assets, workspaceRoot, changedFiles)
    ) {
      continue;
    }

    yield await executeBuild(
      'Changes detected. Rebuilding...',
      {
        options,
        stylesheetBundler,
        allWatchedFiles,
        isWatchMode: true,
        context,
        buildState,
        modifiedFiles: changedFiles,
      },
      withProgress,
      watcher,
      buildAction,
    );
  }
}

/**
 * Loads and parses a JSON file from disk.
 */
async function loadPackageJson(packageJsonPath: string): Promise<PackageJsonData> {
  const content = await fs.readFile(packageJsonPath, 'utf-8');

  return JSON.parse(content) as PackageJsonData;
}

/**
 * Logs the build completion time and status.
 */
function logBuildResult(logger: logging.LoggerApi, startTime: bigint, success: boolean): void {
  const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
  const durationSec = (durationMs / 1000).toFixed(2);

  if (success) {
    logger.info(`Build at: ${new Date().toISOString()} - Time: ${durationMs.toFixed(0)}ms`);
    logger.info(`Built Angular library in ${durationSec}s.`);
  } else {
    logger.error(`Build failed after ${durationSec}s.`);
  }
}
