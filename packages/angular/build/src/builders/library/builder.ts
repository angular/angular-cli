/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import type { logging } from '@angular-devkit/core';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import type ts from 'typescript';
import {
  resetSassWorkerPoolCaches,
  shutdownSassWorkerPool,
} from '../../tools/esbuild/stylesheets/sass-language';
import { transformSupportedBrowsersToTargets } from '../../tools/esbuild/target';
import { withNoProgress, withSpinner } from '../../tools/esbuild/utils';
import { deleteOutputDir } from '../../utils/delete-output-dir';
import { maxWorkers } from '../../utils/environment-options';
import { assertIsError } from '../../utils/error';
import { initializeHash } from '../../utils/hash';
import { toPosixPath } from '../../utils/path';
import { logCumulativeDurations } from '../../utils/profiling';
import { purgeStaleBuildCache } from '../../utils/purge-cache';
import { getSupportedBrowsers } from '../../utils/supported-browsers';
import { assertCompatibleAngularVersion } from '../../utils/version';
import type { BuildWatcher } from '../../utils/watcher';
import { WorkerPool } from '../../utils/worker-pool';
import {
  type NormalizedLibraryOptions,
  type PackageJsonData,
  normalizeLibraryOptions,
} from './options';
import type { EntryPointGraph, EntryPointNode } from './pipeline/entry-point-graph';
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
    { buildAction },
    { buildEntryPointGraph },
    { createComponentStylesheetBundlerForLibrary },
  ] = await Promise.all([
    import('./pipeline/build-action'),
    import('./pipeline/entry-point-graph'),
    import('./pipeline/stylesheet-bundler'),
  ]);

  let graph: EntryPointGraph;
  let batches: EntryPointNode[][];

  try {
    const { packageName, entryPoints } = normalizedOptions;
    graph = await buildEntryPointGraph(entryPoints.values(), packageName, outputPath);
    batches = graph.topologicalSortBatches();
  } catch (error) {
    assertIsError(error);
    yield { success: false, error: error.message };

    return;
  }

  let stylesheetBundler: ReturnType<typeof createComponentStylesheetBundlerForLibrary> | undefined;
  let compilerWorkerPool: WorkerPool | undefined;
  let watcher: BuildWatcher | undefined;
  const sourceFileCache = new Map<string, ts.SourceFile>();

  try {
    const browsers = getSupportedBrowsers(projectRoot, logger);
    const target = transformSupportedBrowsersToTargets(browsers);
    stylesheetBundler = createComponentStylesheetBundlerForLibrary(
      normalizedOptions,
      isWatchMode,
      target,
    );

    if (!isWatchMode) {
      // TODO: Convert to import.meta usage during ESM transition
      const localRequire = createRequire(__filename);

      compilerWorkerPool = new WorkerPool({
        maxThreads: maxWorkers,
        idleTimeout: 4_000,
        filename: localRequire.resolve('./pipeline/compiler-worker'),
      });
    }

    // Track all referenced files for watch mode
    const allWatchedFiles = new Set<string>([tsConfigPath, packageJsonPath]);

    for (const { entryPoint } of graph.nodes.values()) {
      allWatchedFiles.add(entryPoint.entryFilePath);
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
    const startTime = process.hrtime.bigint();
    try {
      await withProgress('Building...', () => {
        assert(stylesheetBundler);

        return buildAction({
          options: normalizedOptions,
          graph,
          batches,
          stylesheetBundler,
          allWatchedFiles,
          isWatchMode,
          context,
          compilerWorkerPool,
          target,
          signal,
          sourceFileCache,
        });
      });

      logBuildResult(logger, startTime, true);
      logCumulativeDurations();

      watcher?.add(Array.from(allWatchedFiles));

      yield { success: true };
    } catch (error) {
      assertIsError(error);
      logBuildResult(logger, startTime, false);

      watcher?.add(Array.from(allWatchedFiles));

      yield { success: false, error: error.message };

      if (!isWatchMode) {
        return;
      }
    }

    if (!isWatchMode || !watcher) {
      return;
    }

    yield* runWatchLoop(
      watcher,
      normalizedOptions,
      graph,
      batches,
      stylesheetBundler,
      allWatchedFiles,
      context,
      withProgress,
      target,
      signal,
      sourceFileCache,
    );
  } finally {
    logCumulativeDurations();
    shutdownSassWorkerPool();

    await Promise.allSettled([
      watcher?.close(),
      stylesheetBundler?.dispose(),
      compilerWorkerPool?.destroy(),
    ]);
  }
}

/**
 * Runs the watch loop, rebuilding the library as watched files are modified.
 *
 * @param watcher The build watcher instance.
 * @param options The normalized library options.
 * @param graph The entry points dependency graph.
 * @param batches The topologically sorted entry point batches.
 * @param stylesheetBundler The component stylesheet bundler instance.
 * @param allWatchedFiles Set of all watched file paths.
 * @param context The architect builder context.
 * @param withProgress Function to wrap build actions with progress reporting.
 * @param target The esbuild target environments derived from browserslist.
 * @param signal Optional abort signal to cancel the watch loop.
 * @param sourceFileCache Optional shared cache of TypeScript source files across entry points.
 * @returns An async generator yielding builder outputs.
 */
async function* runWatchLoop(
  watcher: BuildWatcher,
  options: NormalizedLibraryOptions,
  graph: EntryPointGraph,
  batches: EntryPointNode[][],
  stylesheetBundler: ReturnType<typeof createComponentStylesheetBundlerForLibrary>,
  allWatchedFiles: Set<string>,
  context: BuilderContext,
  withProgress: typeof withSpinner,
  target: string[],
  signal?: AbortSignal,
  sourceFileCache?: Map<string, ts.SourceFile>,
): AsyncIterableIterator<BuilderOutput> {
  // Dynamically lazy-loaded to prevent importing dependencies at the top level.
  const [{ buildAction }, { checkAssetChanges }] = await Promise.all([
    import('./pipeline/build-action'),
    import('./pipeline/assets'),
  ]);

  const { logger } = context;
  const { workspaceRoot, packageJsonPath, assets, clearScreen } = options;

  for await (const changes of watcher) {
    if (signal?.aborted) {
      break;
    }

    if (clearScreen) {
      // eslint-disable-next-line no-console
      console.clear();
    }

    const changedFiles = new Set(changes.all.map(toPosixPath));

    if (sourceFileCache) {
      for (const file of changedFiles) {
        sourceFileCache.delete(file);
      }
    }

    // Check if package.json was modified
    let hasPackageJsonChanges = false;
    const posixPackageJsonPath = toPosixPath(packageJsonPath);
    if (changedFiles.has(posixPackageJsonPath)) {
      try {
        const packageJson = await loadPackageJson(packageJsonPath);
        options.packageJson = packageJson;
        hasPackageJsonChanges = true;
      } catch (error) {
        assertIsError(error);
        yield {
          success: false,
          error: `Failed to reload 'package.json': ${error.message}`,
        };
        continue;
      }
    }

    const hasNodeChanges = graph.markAffectedNodes(changedFiles);

    if (
      !hasNodeChanges &&
      !hasPackageJsonChanges &&
      !checkAssetChanges(assets, workspaceRoot, changedFiles)
    ) {
      continue;
    }

    const hasSassChanges = changes.all.some((f) => /\.(scss|sass|css)$/i.test(f));
    if (hasSassChanges) {
      resetSassWorkerPoolCaches();
    }

    stylesheetBundler.invalidate(changedFiles);

    const startTime = process.hrtime.bigint();

    try {
      await withProgress('Changes detected. Rebuilding...', () =>
        buildAction({
          options,
          graph,
          batches,
          stylesheetBundler,
          allWatchedFiles,
          isWatchMode: true,
          context,
          modifiedFiles: changedFiles,
          target,
          signal,
          sourceFileCache,
        }),
      );

      logBuildResult(logger, startTime, true);
      watcher.add(Array.from(allWatchedFiles));

      yield { success: true };
    } catch (error) {
      assertIsError(error);
      logBuildResult(logger, startTime, false);

      watcher.add(Array.from(allWatchedFiles));

      yield { success: false, error: error.message };
    }
  }
}

/**
 * Loads and validates the package.json file for the library project.
 *
 * @param packageJsonPath Path to the package.json file.
 * @returns The parsed PackageJsonData.
 */
async function loadPackageJson(packageJsonPath: string): Promise<PackageJsonData> {
  let packageJson: PackageJsonData;
  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    packageJson = JSON.parse(packageJsonContent) as PackageJsonData;
  } catch (error) {
    assertIsError(error);
    throw new Error(`Failed to read 'package.json' at '${packageJsonPath}': ${error.message}`, {
      cause: error,
    });
  }

  const { name: packageName } = packageJson;
  if (!packageName) {
    throw new Error(`The package.json at '${packageJsonPath}' must contain a 'name'.`);
  }

  return packageJson;
}

/**
 * Logs the completion or failure message for a library build iteration.
 *
 * @param logger The builder context logger.
 * @param startTime The high-resolution start time of the build iteration.
 * @param success Whether the build iteration succeeded.
 */
function logBuildResult(logger: logging.LoggerApi, startTime: bigint, success: boolean): void {
  const buildDuration = Number(process.hrtime.bigint() - startTime) / 10 ** 9;
  const status = success ? 'complete' : 'failed';
  const message = `\nLibrary bundle generation ${status}. [${buildDuration.toFixed(3)} seconds] - ${new Date().toISOString()}\n`;

  if (success) {
    logger.info(message);
  } else {
    logger.error(message);
  }
}
