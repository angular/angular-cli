/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFile } from 'node:fs/promises';
import { extname, posix } from 'node:path';
import { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import { OutputMode } from '../../builders/application/schema';
import {
  BuildOutputAsset,
  PrerenderedRoutesRecord,
} from '../../tools/esbuild/bundler-execution-result';
import { BuildOutputFile, BuildOutputFileType } from '../../tools/esbuild/bundler-files';
import { assertIsError } from '../error';
import { toPosixPath } from '../path';
import { addLeadingSlash, addTrailingSlash, joinUrlParts, stripLeadingSlash } from '../url';
import { WorkerPool } from '../worker-pool';
import {
  IMPORT_EXEC_ARGV,
  createSharedFile,
  createSharedServerFiles,
} from './esm-in-memory-loader/utils';
import { SERVER_APP_MANIFEST_FILENAME } from './manifest';
import {
  RouteRenderMode,
  RoutersExtractorWorkerResult,
  RoutesExtractorWorkerData,
  SerializableRouteTreeNode,
  WritableSerializableRouteTreeNode,
} from './models';
import type { RenderResult, RenderWorkerData } from './render-worker';
import { generateRedirectStaticPage } from './utils';

type PrerenderOptions = NormalizedApplicationBuildOptions['prerenderOptions'];
type AppShellOptions = NormalizedApplicationBuildOptions['appShellOptions'];

/**
 * Represents the output of a prerendering process.
 *
 * The key is the file path, and the value is an object containing the following properties:
 *
 * - `content`: The HTML content or output generated for the corresponding file path.
 * - `appShellRoute`: A boolean flag indicating whether the content is an app shell.
 *
 * @example
 * {
 *   '/index.html': { content: '<html>...</html>', appShell: false },
 *   '/shell/index.html': { content: '<html>...</html>', appShellRoute: true }
 * }
 */
type PrerenderOutput = Record<string, { content: string; appShellRoute: boolean }>;

export async function prerenderPages(
  workspaceRoot: string,
  baseHref: string,
  appShellOptions: AppShellOptions | undefined,
  prerenderOptions: PrerenderOptions | undefined,
  outputFiles: Readonly<BuildOutputFile[]>,
  assets: Readonly<BuildOutputAsset[]>,
  outputMode: OutputMode | undefined,
  sourcemap = false,
  maxThreads = 1,
): Promise<{
  output: PrerenderOutput;
  warnings: string[];
  errors: string[];
  prerenderedRoutes: PrerenderedRoutesRecord;
  serializableRouteTreeNode: SerializableRouteTreeNode;
}> {
  const rawOutputFiles: Record<string, string> = {};
  const serverBundlesSourceMaps = new Map<string, string>();
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const { text, path, type } of outputFiles) {
    if (type !== BuildOutputFileType.ServerApplication && type !== BuildOutputFileType.ServerRoot) {
      continue;
    }

    // Contains the server runnable application code
    if (extname(path) === '.map') {
      serverBundlesSourceMaps.set(path.slice(0, -4), text);
    } else {
      rawOutputFiles[path] = text;
    }
  }

  // Inline sourcemap into JS file. This is needed to make Node.js resolve sourcemaps
  // when using `--enable-source-maps` when using in memory files.
  for (const [filePath, map] of serverBundlesSourceMaps) {
    const jsContent = rawOutputFiles[filePath];
    if (jsContent) {
      rawOutputFiles[filePath] =
        jsContent +
        '\n//# sourceMappingURL=' +
        `data:application/json;base64,${Buffer.from(map).toString('base64')}`;
    }
  }
  serverBundlesSourceMaps.clear();

  const outputFilesForWorker = createSharedServerFiles(rawOutputFiles);

  const assetsReversed: Record</** Destination */ string, /** Source */ string> = {};
  for (const { source, destination } of assets) {
    // Assets are not stored with baseHref when using i18n,
    // we append the base href so that requests are resolved correctly.
    assetsReversed[joinUrlParts(baseHref, toPosixPath(destination))] = source;
  }

  // Get routes to prerender
  const {
    errors: extractionErrors,
    serializedRouteTree: serializableRouteTreeNode,
    appShellRoute,
  } = await getAllRoutes(
    workspaceRoot,
    baseHref,
    outputFilesForWorker,
    assetsReversed,
    appShellOptions,
    prerenderOptions,
    sourcemap,
    outputMode,
  ).catch((err) => {
    assertIsError(err);

    return {
      errors: [
        `An error occurred while extracting routes.\n\n${err.stack ?? err.message ?? err.code ?? err}`,
      ],
      serializedRouteTree: [],
      appShellRoute: undefined,
    };
  });

  errors.push(...extractionErrors);

  const serializableRouteTreeNodeForPrerender: WritableSerializableRouteTreeNode = [];
  for (const metadata of serializableRouteTreeNode) {
    if (outputMode !== OutputMode.Static && metadata.redirectTo) {
      // Skip redirects if output mode is not static.
      continue;
    }

    if (metadata.route.includes('*')) {
      // Skip catch all routes from prerender.
      continue;
    }

    switch (metadata.renderMode) {
      case undefined: /* Legacy building mode */
      case RouteRenderMode.Prerender:
        serializableRouteTreeNodeForPrerender.push(metadata);
        break;
      case RouteRenderMode.Server:
        if (outputMode === OutputMode.Static) {
          errors.push(
            `Route '${metadata.route}' is configured with server render mode, but the build 'outputMode' is set to 'static'.`,
          );
        }
        break;
    }
  }

  if (!serializableRouteTreeNodeForPrerender.length || errors.length > 0) {
    return {
      errors,
      warnings,
      output: {},
      prerenderedRoutes: {},
      serializableRouteTreeNode,
    };
  }

  // Add the extracted routes to the manifest file.
  // We could re-generate it from the start, but that would require a number of options to be passed down.
  const manifest = outputFilesForWorker[SERVER_APP_MANIFEST_FILENAME];
  if (manifest) {
    const manifestText = new TextDecoder().decode(manifest);

    outputFilesForWorker[SERVER_APP_MANIFEST_FILENAME] = createSharedFile(
      manifestText.replace(
        'routes: undefined,',
        `routes: ${JSON.stringify(serializableRouteTreeNodeForPrerender, undefined, 2)},`,
      ),
    );
  }

  // Render routes
  const { errors: renderingErrors, output } = await renderPages(
    baseHref,
    sourcemap,
    serializableRouteTreeNodeForPrerender,
    maxThreads,
    workspaceRoot,
    outputFilesForWorker,
    assetsReversed,
    outputMode,
    appShellRoute ?? appShellOptions?.route,
  );

  errors.push(...renderingErrors);

  const prerenderedRoutes: PrerenderedRoutesRecord = {};
  const baseHrefPathnameWithLeadingSlash = new URL(baseHref, 'http://localhost').pathname;

  for (const metadata of serializableRouteTreeNodeForPrerender) {
    const outPath = getRouteOutPath(metadata.route, baseHrefPathnameWithLeadingSlash);

    if (output[outPath]) {
      prerenderedRoutes[metadata.route] = { headers: metadata.headers };
    }
  }

  return {
    errors,
    warnings,
    output,
    prerenderedRoutes,
    serializableRouteTreeNode,
  };
}

async function renderPages(
  baseHref: string,
  sourcemap: boolean,
  serializableRouteTreeNode: SerializableRouteTreeNode,
  maxThreads: number,
  workspaceRoot: string,
  outputFilesForWorker: Record<string, Uint8Array>,
  assetFilesForWorker: Record<string, string>,
  outputMode: OutputMode | undefined,
  appShellRoute: string | undefined,
): Promise<{
  output: PrerenderOutput;
  errors: string[];
}> {
  const output: PrerenderOutput = {};
  const errors: string[] = [];

  const baseHrefPathnameWithLeadingSlash = new URL(baseHref, 'http://localhost').pathname;
  const appShellRouteWithoutBaseHref = appShellRoute
    ? addLeadingSlash(getRouteWithoutBaseHref(appShellRoute, baseHrefPathnameWithLeadingSlash))
    : undefined;

  const routesToRender: { route: string; outPath: string; isAppShell: boolean }[] = [];

  for (const { route, redirectTo } of serializableRouteTreeNode) {
    // Remove the base href from the file output path.
    const routeWithoutBaseHref = getRouteWithoutBaseHref(route, baseHrefPathnameWithLeadingSlash);
    const outPath = getRouteOutPath(route, baseHrefPathnameWithLeadingSlash);

    if (typeof redirectTo === 'string') {
      output[outPath] = { content: generateRedirectStaticPage(redirectTo), appShellRoute: false };

      continue;
    }

    routesToRender.push({
      route,
      outPath,
      isAppShell: appShellRouteWithoutBaseHref === routeWithoutBaseHref,
    });
  }

  if (routesToRender.length === 0) {
    return {
      errors,
      output,
    };
  }

  // Batch routes to reduce IPC overhead while ensuring enough batches exist for load balancing across worker threads.
  const batchSize = Math.max(1, Math.min(50, Math.ceil(routesToRender.length / (maxThreads * 4))));
  const numBatches = Math.ceil(routesToRender.length / batchSize);
  const effectiveMaxThreads = Math.min(numBatches, maxThreads);

  const workerExecArgv = [IMPORT_EXEC_ARGV];
  if (sourcemap) {
    workerExecArgv.push('--enable-source-maps');
  }

  const renderWorker = new WorkerPool({
    filename: require.resolve('./render-worker'),
    maxThreads: effectiveMaxThreads,
    workerData: {
      workspaceRoot,
      outputFiles: outputFilesForWorker,
      assetFiles: assetFilesForWorker,
      outputMode,
      hasSsrEntry: !!outputFilesForWorker['server.mjs'],
    } as RenderWorkerData,
    execArgv: workerExecArgv,
    env: {
      ...process.env,
      'NG_ALLOWED_HOSTS': 'localhost',
    },
  });

  try {
    const routeOutPathMap = new Map<string, { outPath: string; isAppShell: boolean }>();
    for (const item of routesToRender) {
      routeOutPathMap.set(item.route, item);
    }

    const renderingPromises: Promise<void>[] = [];

    for (let i = 0; i < routesToRender.length; i += batchSize) {
      const batch = routesToRender.slice(i, i + batchSize);
      const urls = batch.map((item) => item.route);
      const renderBatchPromise: Promise<RenderResult> = renderWorker.run(urls);
      const batchResultPromise = renderBatchPromise
        .then((results) => {
          for (const result of results) {
            if ('error' in result) {
              errors.push(
                `An error occurred while prerendering route '${result.url}'.\n\n${result.error}`,
              );
              continue;
            }

            const routeInfo = routeOutPathMap.get(result.url);
            if (routeInfo) {
              output[routeInfo.outPath] = {
                content: result.content,
                appShellRoute: routeInfo.isAppShell,
              };
            }
          }
        })
        .catch((err) => {
          assertIsError(err);
          for (const url of urls) {
            errors.push(
              `An error occurred while prerendering route '${url}'.\n\n${err.stack ?? err.message ?? err.code ?? err}`,
            );
          }
        });

      renderingPromises.push(batchResultPromise);
    }

    await Promise.all(renderingPromises);
  } finally {
    void renderWorker.destroy();
  }

  return {
    errors,
    output,
  };
}

async function getAllRoutes(
  workspaceRoot: string,
  baseHref: string,
  outputFilesForWorker: Record<string, Uint8Array>,
  assetFilesForWorker: Record<string, string>,
  appShellOptions: AppShellOptions | undefined,
  prerenderOptions: PrerenderOptions | undefined,
  sourcemap: boolean,
  outputMode: OutputMode | undefined,
): Promise<{
  serializedRouteTree: SerializableRouteTreeNode;
  appShellRoute?: string;
  errors: string[];
}> {
  const { routesFile, discoverRoutes } = prerenderOptions ?? {};
  const routes: WritableSerializableRouteTreeNode = [];
  let appShellRoute: string | undefined;

  if (appShellOptions) {
    appShellRoute = joinUrlParts(baseHref, appShellOptions.route);

    routes.push({
      renderMode: RouteRenderMode.Prerender,
      route: appShellRoute,
    });
  }

  if (routesFile) {
    const routesFromFile = (await readFile(routesFile, 'utf8')).split(/\r?\n/);
    for (const route of routesFromFile) {
      routes.push({
        renderMode: RouteRenderMode.Prerender,
        route: joinUrlParts(baseHref, route.trim()),
      });
    }
  }

  if (!discoverRoutes) {
    return { errors: [], appShellRoute, serializedRouteTree: routes };
  }

  const workerExecArgv = [IMPORT_EXEC_ARGV];

  if (sourcemap) {
    workerExecArgv.push('--enable-source-maps');
  }

  const renderWorker = new WorkerPool({
    filename: require.resolve('./routes-extractor-worker'),
    maxThreads: 1,
    workerData: {
      workspaceRoot,
      outputFiles: outputFilesForWorker,
      assetFiles: assetFilesForWorker,
      outputMode,
      hasSsrEntry: !!outputFilesForWorker['server.mjs'],
    } as RoutesExtractorWorkerData,
    execArgv: workerExecArgv,
    env: {
      ...process.env,
      'NG_ALLOWED_HOSTS': 'localhost',
    },
  });

  try {
    const { serializedRouteTree, appShellRoute, errors }: RoutersExtractorWorkerResult =
      await renderWorker.run({});

    if (!routes.length) {
      return { errors, appShellRoute, serializedRouteTree };
    }

    // Merge the routing trees
    const uniqueRoutes = new Map();
    for (const item of [...routes, ...serializedRouteTree]) {
      if (!uniqueRoutes.has(item.route)) {
        uniqueRoutes.set(item.route, item);
      }
    }

    return { errors, serializedRouteTree: Array.from(uniqueRoutes.values()) };
  } catch (err) {
    assertIsError(err);

    return {
      errors: [
        `An error occurred while extracting routes.\n\n${err.stack ?? err.message ?? err.code ?? err}`,
      ],
      serializedRouteTree: [],
    };
  } finally {
    void renderWorker.destroy();
  }
}

function getRouteWithoutBaseHref(route: string, baseHrefPathname: string): string {
  return addTrailingSlash(route).startsWith(baseHrefPathname)
    ? addLeadingSlash(route.slice(baseHrefPathname.length))
    : route;
}

function getRouteOutPath(route: string, baseHrefPathname: string): string {
  const routeWithoutBaseHref = getRouteWithoutBaseHref(route, baseHrefPathname);

  return stripLeadingSlash(posix.join(routeWithoutBaseHref, 'index.html'));
}
