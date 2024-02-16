/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderOutput } from '@angular-devkit/architect';
import type { logging } from '@angular-devkit/core';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { BuildOutputFile } from '../../tools/esbuild/bundler-context';
import { ExecutionResult, RebuildState } from '../../tools/esbuild/bundler-execution-result';
import { shutdownSassWorkerPool } from '../../tools/esbuild/stylesheets/sass-language';
import { withNoProgress, withSpinner, writeResultFiles } from '../../tools/esbuild/utils';
import { deleteOutputDir } from '../../utils/delete-output-dir';
import { shouldWatchRoot } from '../../utils/environment-options';
import { NormalizedCachedOptions } from '../../utils/normalize-cache';
import { NormalizedOutputOptions } from './options';

// Watch workspace for package manager changes
const packageWatchFiles = [
  // manifest can affect module resolution
  'package.json',
  // npm lock file
  'package-lock.json',
  // pnpm lock file
  'pnpm-lock.yaml',
  // yarn lock file including Yarn PnP manifest files (https://yarnpkg.com/advanced/pnp-spec/)
  'yarn.lock',
  '.pnp.cjs',
  '.pnp.data.json',
];

export async function* runEsBuildBuildAction(
  action: (rebuildState?: RebuildState) => ExecutionResult | Promise<ExecutionResult>,
  options: {
    workspaceRoot: string;
    projectRoot: string;
    outputOptions: NormalizedOutputOptions;
    logger: logging.LoggerApi;
    cacheOptions: NormalizedCachedOptions;
    writeToFileSystem: boolean;
    writeToFileSystemFilter: ((file: BuildOutputFile) => boolean) | undefined;
    watch?: boolean;
    verbose?: boolean;
    progress?: boolean;
    deleteOutputPath?: boolean;
    poll?: number;
    signal?: AbortSignal;
    preserveSymlinks?: boolean;
    clearScreen?: boolean;
  },
): AsyncIterable<(ExecutionResult['outputWithFiles'] | ExecutionResult['output']) & BuilderOutput> {
  const {
    writeToFileSystemFilter,
    writeToFileSystem,
    watch,
    poll,
    clearScreen,
    logger,
    deleteOutputPath,
    cacheOptions,
    outputOptions,
    verbose,
    projectRoot,
    workspaceRoot,
    progress,
    preserveSymlinks,
  } = options;

  if (deleteOutputPath && writeToFileSystem) {
    await deleteOutputDir(workspaceRoot, outputOptions.base, [
      outputOptions.browser,
      outputOptions.server,
    ]);
  }

  const withProgress: typeof withSpinner = progress ? withSpinner : withNoProgress;

  // Initial build
  let result: ExecutionResult;
  try {
    // Perform the build action
    result = await withProgress('Building...', () => action());
  } finally {
    // Ensure Sass workers are shutdown if not watching
    if (!watch) {
      shutdownSassWorkerPool();
    }
  }

  // Setup watcher if watch mode enabled
  let watcher: import('../../tools/esbuild/watcher').BuildWatcher | undefined;
  if (watch) {
    if (progress) {
      logger.info('Watch mode enabled. Watching for file changes...');
    }

    const ignored: string[] = [
      // Ignore the output and cache paths to avoid infinite rebuild cycles
      outputOptions.base,
      cacheOptions.basePath,
      `${workspaceRoot.replace(/\\/g, '/')}/**/.*/**`,
    ];

    if (!preserveSymlinks) {
      // Ignore all node modules directories to avoid excessive file watchers.
      // Package changes are handled below by watching manifest and lock files.
      // NOTE: this is not enable when preserveSymlinks is true as this would break `npm link` usages.
      ignored.push('**/node_modules/**');
    }

    // Setup a watcher
    const { createWatcher } = await import('../../tools/esbuild/watcher');
    watcher = createWatcher({
      polling: typeof poll === 'number',
      interval: poll,
      followSymlinks: preserveSymlinks,
      ignored,
    });

    // Setup abort support
    options.signal?.addEventListener('abort', () => void watcher?.close());

    // Watch the entire project root if 'NG_BUILD_WATCH_ROOT' environment variable is set
    if (shouldWatchRoot) {
      watcher.add(projectRoot);
    }

    watcher.add(
      packageWatchFiles
        .map((file) => path.join(workspaceRoot, file))
        .filter((file) => existsSync(file)),
    );

    // Watch locations provided by the initial build result
    watcher.add(result.watchFiles);
  }

  // Output the first build results after setting up the watcher to ensure that any code executed
  // higher in the iterator call stack will trigger the watcher. This is particularly relevant for
  // unit tests which execute the builder and modify the file system programmatically.
  if (writeToFileSystem) {
    // Write output files
    await writeResultFiles(result.outputFiles, result.assetFiles, outputOptions);

    yield result.output;
  } else {
    // Requires casting due to unneeded `JsonObject` requirement. Remove once fixed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yield result.outputWithFiles as any;
  }

  // Finish if watch mode is not enabled
  if (!watcher) {
    return;
  }

  // Wait for changes and rebuild as needed
  const currentWatchFiles = new Set(result.watchFiles);
  try {
    for await (const changes of watcher) {
      if (options.signal?.aborted) {
        break;
      }

      if (clearScreen) {
        // eslint-disable-next-line no-console
        console.clear();
      }

      if (verbose) {
        logger.info(changes.toDebugString());
      }

      result = await withProgress('Changes detected. Rebuilding...', () =>
        action(result.createRebuildState(changes)),
      );

      // Update watched locations provided by the new build result.
      // Keep watching all previous files if there are any errors; otherwise consider all
      // files stale until confirmed present in the new result's watch files.
      const staleWatchFiles = result.errors.length > 0 ? undefined : new Set(currentWatchFiles);
      for (const watchFile of result.watchFiles) {
        if (!currentWatchFiles.has(watchFile)) {
          // Add new watch location
          watcher.add(watchFile);
          currentWatchFiles.add(watchFile);
        }

        // Present so remove from stale locations
        staleWatchFiles?.delete(watchFile);
      }
      // Remove any stale locations if the build was successful
      if (staleWatchFiles?.size) {
        watcher.remove([...staleWatchFiles]);
      }

      if (writeToFileSystem) {
        // Write output files
        const filesToWrite = writeToFileSystemFilter
          ? result.outputFiles.filter(writeToFileSystemFilter)
          : result.outputFiles;
        await writeResultFiles(filesToWrite, result.assetFiles, outputOptions);

        yield result.output;
      } else {
        // Requires casting due to unneeded `JsonObject` requirement. Remove once fixed.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yield result.outputWithFiles as any;
      }
    }
  } finally {
    // Stop the watcher and cleanup incremental rebuild state
    await Promise.allSettled([watcher.close(), result.dispose()]);

    shutdownSassWorkerPool();
  }
}
