/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { BuildOutputFile, BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import { ExecutionResult, RebuildState } from '../../tools/esbuild/bundler-execution-result';
import { shutdownSassWorkerPool } from '../../tools/esbuild/stylesheets/sass-language';
import { logMessages, withNoProgress, withSpinner } from '../../tools/esbuild/utils';
import { ChangedFiles } from '../../tools/esbuild/watcher';
import { shouldWatchRoot } from '../../utils/environment-options';
import { NormalizedCachedOptions } from '../../utils/normalize-cache';
import { toPosixPath } from '../../utils/path';
import { NormalizedApplicationBuildOptions, NormalizedOutputOptions } from './options';
import {
  ComponentUpdateResult,
  FullResult,
  IncrementalResult,
  Result,
  ResultKind,
  ResultMessage,
} from './results';

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
  action: (rebuildState?: RebuildState) => Promise<ExecutionResult>,
  options: {
    workspaceRoot: string;
    projectRoot: string;
    outputOptions: NormalizedOutputOptions;
    logger: BuilderContext['logger'];
    cacheOptions: NormalizedCachedOptions;
    watch?: boolean;
    verbose?: boolean;
    progress?: boolean;
    poll?: number;
    signal?: AbortSignal;
    preserveSymlinks?: boolean;
    clearScreen?: boolean;
    colors?: boolean;
    jsonLogs?: boolean;
    incrementalResults?: boolean;
  },
): AsyncIterable<Result> {
  const {
    watch,
    poll,
    clearScreen,
    logger,
    cacheOptions,
    outputOptions,
    verbose,
    projectRoot,
    workspaceRoot,
    progress,
    preserveSymlinks,
    colors,
    jsonLogs,
    incrementalResults,
  } = options;

  const withProgress: typeof withSpinner = progress ? withSpinner : withNoProgress;

  // Initial build
  let result: ExecutionResult;
  try {
    // Perform the build action
    result = await withProgress('Building...', () => action());

    // Log all diagnostic (error/warning/logs) messages
    await logMessages(logger, result, colors, jsonLogs);
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
      `${toPosixPath(workspaceRoot)}/**/.*/**`,
    ];

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
      if (!preserveSymlinks) {
        // Ignore all node modules directories to avoid excessive file watchers.
        // Package changes are handled below by watching manifest and lock files.
        // NOTE: this is not enable when preserveSymlinks is true as this would break `npm link` usages.
        ignored.push('**/node_modules/**');

        watcher.add(
          packageWatchFiles
            .map((file) => path.join(workspaceRoot, file))
            .filter((file) => existsSync(file)),
        );
      }

      watcher.add(projectRoot);
    }

    // Watch locations provided by the initial build result
    watcher.add(result.watchFiles);
  }

  // Output the first build results after setting up the watcher to ensure that any code executed
  // higher in the iterator call stack will trigger the watcher. This is particularly relevant for
  // unit tests which execute the builder and modify the file system programmatically.
  yield* emitOutputResults(result, outputOptions);

  // Finish if watch mode is not enabled
  if (!watcher) {
    return;
  }

  // Used to force a full result on next rebuild if there were initial errors.
  // This ensures at least one full result is emitted.
  let hasInitialErrors = result.errors.length > 0;

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

      // Clear removed files from current watch files
      changes.removed.forEach((removedPath) => currentWatchFiles.delete(removedPath));

      const rebuildState = result.createRebuildState(changes);
      result = await withProgress('Changes detected. Rebuilding...', () => action(rebuildState));

      // Log all diagnostic (error/warning/logs) messages
      await logMessages(logger, result, colors, jsonLogs);

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

      for (const outputResult of emitOutputResults(
        result,
        outputOptions,
        changes,
        incrementalResults && !hasInitialErrors ? rebuildState : undefined,
      )) {
        yield outputResult;
      }

      // Clear initial build errors flag if no errors are now present
      hasInitialErrors &&= result.errors.length > 0;
    }
  } finally {
    // Stop the watcher and cleanup incremental rebuild state
    await Promise.allSettled([watcher.close(), result.dispose()]);

    shutdownSassWorkerPool();
  }
}

function* emitOutputResults(
  {
    outputFiles,
    assetFiles,
    errors,
    warnings,
    externalMetadata,
    htmlIndexPath,
    htmlBaseHref,
    templateUpdates,
  }: ExecutionResult,
  outputOptions: NormalizedApplicationBuildOptions['outputOptions'],
  changes?: ChangedFiles,
  rebuildState?: RebuildState,
): Iterable<Result> {
  if (errors.length > 0) {
    yield {
      kind: ResultKind.Failure,
      errors: errors as ResultMessage[],
      warnings: warnings as ResultMessage[],
      detail: {
        outputOptions,
      },
    };

    return;
  }

  // Use a full result if there is no rebuild state (no prior build result)
  if (!rebuildState || !changes) {
    const result: FullResult = {
      kind: ResultKind.Full,
      warnings: warnings as ResultMessage[],
      files: {},
      detail: {
        externalMetadata,
        htmlIndexPath,
        htmlBaseHref,
        outputOptions,
      },
    };
    for (const file of assetFiles) {
      result.files[file.destination] = {
        type: BuildOutputFileType.Browser,
        inputPath: file.source,
        origin: 'disk',
      };
    }
    for (const file of outputFiles) {
      result.files[file.path] = {
        type: file.type,
        contents: file.contents,
        origin: 'memory',
        hash: file.hash,
      };
    }

    yield result;

    return;
  }

  // Template updates only exist if no other JS changes have occurred.
  // A full page reload may be required based on the following incremental output change analysis.
  const hasTemplateUpdates = !!templateUpdates?.size;

  // Use an incremental result if previous output information is available
  const { previousAssetsInfo, previousOutputInfo } = rebuildState;

  const incrementalResult: IncrementalResult = {
    kind: ResultKind.Incremental,
    warnings: warnings as ResultMessage[],
    // Initially attempt to use a background update of files to support component updates.
    background: hasTemplateUpdates,
    added: [],
    removed: [],
    modified: [],
    files: {},
    detail: {
      externalMetadata,
      htmlIndexPath,
      htmlBaseHref,
      outputOptions,
    },
  };

  let hasCssUpdates = false;

  // Initially assume all previous output files have been removed
  const removedOutputFiles = new Map(previousOutputInfo);
  for (const file of outputFiles) {
    removedOutputFiles.delete(file.path);

    const previousHash = previousOutputInfo.get(file.path)?.hash;
    let needFile = false;
    if (previousHash === undefined) {
      needFile = true;
      incrementalResult.added.push(file.path);
    } else if (previousHash !== file.hash) {
      needFile = true;
      incrementalResult.modified.push(file.path);
    }

    if (needFile) {
      if (file.path.endsWith('.css')) {
        hasCssUpdates = true;
      } else if (!canBackgroundUpdate(file)) {
        incrementalResult.background = false;
      }

      incrementalResult.files[file.path] = {
        type: file.type,
        contents: file.contents,
        origin: 'memory',
        hash: file.hash,
      };
    }
  }

  // Initially assume all previous assets files have been removed
  const removedAssetFiles = new Map(previousAssetsInfo);
  for (const { source, destination } of assetFiles) {
    removedAssetFiles.delete(source);

    if (!previousAssetsInfo.has(source)) {
      incrementalResult.added.push(destination);
      incrementalResult.background = false;
    } else if (changes.modified.has(source)) {
      incrementalResult.modified.push(destination);
      incrementalResult.background = false;
    } else {
      continue;
    }

    hasCssUpdates ||= destination.endsWith('.css');

    incrementalResult.files[destination] = {
      type: BuildOutputFileType.Browser,
      inputPath: source,
      origin: 'disk',
    };
  }

  // Do not remove stale files yet if there are template updates.
  // Component chunk files may still be referenced in running browser code.
  // Module evaluation time component updates will update any of these files.
  // This typically occurs when a lazy component is changed that has not yet
  // been accessed at runtime.
  if (hasTemplateUpdates && incrementalResult.background) {
    removedOutputFiles.clear();
  }

  // Include the removed output and asset files
  incrementalResult.removed.push(
    ...Array.from(removedOutputFiles, ([file, { type }]) => ({
      path: file,
      type,
    })),
    ...Array.from(removedAssetFiles.values(), (file) => ({
      path: file,
      type: BuildOutputFileType.Browser,
    })),
  );

  yield incrementalResult;

  // If there are template updates and the incremental update was background only, a component
  // update is possible.
  if (hasTemplateUpdates && incrementalResult.background) {
    // Template changes may be accompanied by stylesheet changes and these should also be updated hot when possible.
    if (hasCssUpdates) {
      const styleResult: IncrementalResult = {
        kind: ResultKind.Incremental,
        added: incrementalResult.added.filter(isCssFilePath),
        removed: incrementalResult.removed.filter(({ path }) => isCssFilePath(path)),
        modified: incrementalResult.modified.filter(isCssFilePath),
        files: Object.fromEntries(
          Object.entries(incrementalResult.files).filter(([path]) => isCssFilePath(path)),
        ),
      };

      yield styleResult;
    }

    const updateResult: ComponentUpdateResult = {
      kind: ResultKind.ComponentUpdate,
      updates: Array.from(templateUpdates, ([id, content]) => ({
        type: 'template',
        id,
        content,
      })),
    };

    yield updateResult;
  }
}

function isCssFilePath(filePath: string): boolean {
  return /\.css(?:\.map)?$/i.test(filePath);
}

function canBackgroundUpdate(file: BuildOutputFile): boolean {
  // Files in the output root are not served and do not affect the
  // application available with the development server.
  if (file.type === BuildOutputFileType.Root) {
    return true;
  }

  // Updates to non-JS files must signal an update with the dev server
  // except the service worker configuration which is special cased.
  return /(?:\.m?js|\.map)$/.test(file.path) || file.path === 'ngsw.json';
}
