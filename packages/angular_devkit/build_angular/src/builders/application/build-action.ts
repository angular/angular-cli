/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderOutput } from '@angular-devkit/architect';
import type { logging } from '@angular-devkit/core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ExecutionResult, RebuildState } from '../../tools/esbuild/bundler-execution-result';
import { shutdownSassWorkerPool } from '../../tools/esbuild/stylesheets/sass-language';
import { withNoProgress, withSpinner, writeResultFiles } from '../../tools/esbuild/utils';
import { assertIsError } from '../../utils/error';
import { NormalizedCachedOptions } from '../../utils/normalize-cache';

export async function* runEsBuildBuildAction(
  action: (rebuildState?: RebuildState) => ExecutionResult | Promise<ExecutionResult>,
  options: {
    workspaceRoot: string;
    projectRoot: string;
    outputPath: string;
    logger: logging.LoggerApi;
    cacheOptions: NormalizedCachedOptions;
    writeToFileSystem?: boolean;
    watch?: boolean;
    verbose?: boolean;
    progress?: boolean;
    deleteOutputPath?: boolean;
    poll?: number;
  },
): AsyncIterable<(ExecutionResult['outputWithFiles'] | ExecutionResult['output']) & BuilderOutput> {
  const {
    writeToFileSystem = true,
    watch,
    poll,
    logger,
    deleteOutputPath,
    cacheOptions,
    outputPath,
    verbose,
    projectRoot,
    workspaceRoot,
    progress,
  } = options;

  if (writeToFileSystem) {
    // Clean output path if enabled
    if (deleteOutputPath) {
      if (outputPath === workspaceRoot) {
        logger.error('Output path MUST not be workspace root directory!');

        return;
      }

      await fs.rm(outputPath, { force: true, recursive: true, maxRetries: 3 });
    }

    // Create output directory if needed
    try {
      await fs.mkdir(outputPath, { recursive: true });
    } catch (e) {
      assertIsError(e);
      logger.error('Unable to create output directory: ' + e.message);

      return;
    }
  }

  const withProgress: typeof withSpinner = progress ? withSpinner : withNoProgress;

  // Initial build
  let result: ExecutionResult;
  try {
    result = await withProgress('Building...', () => action());

    if (writeToFileSystem) {
      // Write output files
      await writeResultFiles(result.outputFiles, result.assetFiles, outputPath);

      yield result.output;
    } else {
      // Requires casting due to unneeded `JsonObject` requirement. Remove once fixed.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yield result.outputWithFiles as any;
    }

    // Finish if watch mode is not enabled
    if (!watch) {
      return;
    }
  } finally {
    // Ensure Sass workers are shutdown if not watching
    if (!watch) {
      shutdownSassWorkerPool();
    }
  }

  if (progress) {
    logger.info('Watch mode enabled. Watching for file changes...');
  }

  // Setup a watcher
  const { createWatcher } = await import('../../tools/esbuild/watcher');
  const watcher = createWatcher({
    polling: typeof poll === 'number',
    interval: poll,
    ignored: [
      // Ignore the output and cache paths to avoid infinite rebuild cycles
      outputPath,
      cacheOptions.basePath,
      // Ignore all node modules directories to avoid excessive file watchers.
      // Package changes are handled below by watching manifest and lock files.
      '**/node_modules/**',
      '**/.*/**',
    ],
  });

  // Temporarily watch the entire project
  watcher.add(projectRoot);

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

  watcher.add(packageWatchFiles.map((file) => path.join(workspaceRoot, file)));

  // Watch locations provided by the initial build result
  let previousWatchFiles = new Set(result.watchFiles);
  watcher.add(result.watchFiles);

  // Wait for changes and rebuild as needed
  try {
    for await (const changes of watcher) {
      if (verbose) {
        logger.info(changes.toDebugString());
      }

      result = await withProgress('Changes detected. Rebuilding...', () =>
        action(result.createRebuildState(changes)),
      );

      // Update watched locations provided by the new build result.
      // Add any new locations
      watcher.add(result.watchFiles.filter((watchFile) => !previousWatchFiles.has(watchFile)));
      const newWatchFiles = new Set(result.watchFiles);
      // Remove any old locations
      watcher.remove([...previousWatchFiles].filter((watchFile) => !newWatchFiles.has(watchFile)));
      previousWatchFiles = newWatchFiles;

      if (writeToFileSystem) {
        // Write output files
        await writeResultFiles(result.outputFiles, result.assetFiles, outputPath);

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
