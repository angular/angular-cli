/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { fork } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BuildOutputFile, BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import { BuildOutputAsset } from '../../tools/esbuild/bundler-execution-result';
import { ESMInMemoryFileLoaderWorkerData } from './esm-in-memory-loader/loader-hooks';
import { isLegacyESMLoaderImplementation } from './esm-in-memory-loader/utils-lts-node';
import type {
  PrerenderPagesOptions,
  ProcessMessages,
  ReadyMessage,
} from './prerender-child-process';

export interface PrerenderOptions {
  routesFile?: string;
  discoverRoutes?: boolean;
}

export interface AppShellOptions {
  route?: string;
}

export function prerenderPages(
  workspaceRoot: string,
  appShellOptions: AppShellOptions = {},
  prerenderOptions: PrerenderOptions = {},
  outputFiles: Readonly<BuildOutputFile[]>,
  assets: Readonly<BuildOutputAsset[]>,
  document: string,
  sourcemap = false,
  inlineCriticalCss = false,
  maxThreads = 1,
  verbose = false,
): Promise<{
  output: Record<string, string>;
  warnings: string[];
  errors: string[];
  prerenderedRoutes: string[];
}> {
  const cssOutputFilesForWorker: Record<string, string> = {};
  const jsOutputFilesForWorker: Record<string, string> = {};
  const serverBundlesSourceMaps = new Map<string, string>();

  for (const { text, path, type } of outputFiles) {
    switch (type) {
      case BuildOutputFileType.Browser:
        if (path.endsWith('.css')) {
          // Global styles for critical CSS inlining.
          cssOutputFilesForWorker[path] = text;
        }
        break;
      case BuildOutputFileType.Server:
        if (path.endsWith('.map')) {
          serverBundlesSourceMaps.set(path.slice(0, -4), text);
        } else {
          // Contains the server runnable application code
          jsOutputFilesForWorker[path] = text;
        }
        break;
    }
  }

  // Inline sourcemap into JS file. This is needed to make Node.js resolve sourcemaps
  // when using `--enable-source-maps` when using in memory files.
  for (const [filePath, map] of serverBundlesSourceMaps) {
    const jsContent = jsOutputFilesForWorker[filePath];
    if (jsContent) {
      jsOutputFilesForWorker[filePath] =
        jsContent +
        `\n//# sourceMappingURL=` +
        `data:application/json;base64,${Buffer.from(map).toString('base64')}`;
    }
  }
  serverBundlesSourceMaps.clear();

  const childProcess = fork(join(__dirname, 'prerender-child-process.js'), {
    execArgv: [
      '--import',
      // Loader cannot be an absolute path on Windows.
      pathToFileURL(join(__dirname, 'esm-in-memory-loader/register-hooks.js')).href,
    ],
  });

  // Send data to ESM loader worker.
  const esmLoaderData: ESMInMemoryFileLoaderWorkerData = {
    workspaceRoot,
    jsOutputFilesForWorker,
  };
  childProcess.send(esmLoaderData);

  return new Promise<ReadyMessage['data']>((resolve, reject) => {
    childProcess
      .once('error', reject)
      .once('uncaughtException', reject)
      .on('message', ({ type, data }: ProcessMessages) => {
        switch (type) {
          case 'start':
            const prerenderPagesOptions: PrerenderPagesOptions = {
              appShellOptions,
              prerenderOptions,
              assets,
              document,
              sourcemap,
              inlineCriticalCss,
              maxThreads,
              verbose,
              cssOutputFilesForWorker,
              workspaceRoot,
            };

            // TODO: remove when Node.js version 22.2 is no longer supported.
            if (isLegacyESMLoaderImplementation) {
              prerenderPagesOptions.jsOutputFilesForWorker = jsOutputFilesForWorker;
              prerenderPagesOptions.workspaceRoot = workspaceRoot;
            }
            childProcess.send(prerenderPagesOptions);
            break;
          case 'ready':
            resolve(data);
            break;
          case 'error':
            const { name, message, stack } = data;
            const err = new Error(message);
            err.name = name;
            err.stack = stack;

            reject(err);
            break;
          default:
            throw new Error(`Unhandled message type "${type}" from forked process.`);
        }
      });
  }).finally(() => {
    childProcess.kill();
  });
}
