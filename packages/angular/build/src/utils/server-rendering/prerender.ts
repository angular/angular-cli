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
import { OutputMode, PrerenderFormat } from '../../builders/application/schema';
import {
  BuildOutputAsset,
  PrerenderedRoutesRecord,
} from '../../tools/esbuild/bundler-execution-result';
import { BuildOutputFile, BuildOutputFileType } from '../../tools/esbuild/bundler-files';
import { assertIsError } from '../error';
import { toPosixPath } from '../path';
import {
  addLeadingSlash,
  addTrailingSlash,
  joinUrlParts,
  stripLeadingSlash,
  stripTrailingSlash,
} from '../url';
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
 *
 * With the 'file' format, non-root routes are keyed as `<route>.html` (e.g. 'shell.html').
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
  format: PrerenderFormat,
  indexOutput: string | undefined,
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
  const {
    errors: renderingErrors,
    warnings: renderingWarnings,
    output,
    outPaths,
  } = await renderPages(
    baseHref,
    sourcemap,
    serializableRouteTreeNodeForPrerender,
    maxThreads,
    workspaceRoot,
    outputFilesForWorker,
    assetsReversed,
    outputMode,
    format,
    indexOutput,
    appShellRoute ?? appShellOptions?.route,
  );

  errors.push(...renderingErrors);
  warnings.push(...renderingWarnings);

  const prerenderedRoutes: PrerenderedRoutesRecord = {};

  for (const metadata of serializableRouteTreeNodeForPrerender) {
    const outPath = outPaths.get(metadata.route);

    if (outPath !== undefined && output[outPath]) {
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
  format: PrerenderFormat,
  indexOutput: string | undefined,
  appShellRoute: string | undefined,
): Promise<{
  output: PrerenderOutput;
  outPaths: Map<string, string>;
  errors: string[];
  warnings: string[];
}> {
  const output: PrerenderOutput = {};
  const outPaths = new Map<string, string>();
  const errors: string[] = [];
  const warnings: string[] = [];
  // Output files taken by routes in the 'file' format, lower-cased because
  // 'Foo.html' and 'foo.html' are the same file on case-insensitive file systems.
  const usedFiles = new Map<string, string>();

  const baseHrefPathnameWithLeadingSlash = new URL(baseHref, 'http://localhost').pathname;
  const lowerIndexOutput = indexOutput?.toLowerCase();
  const appShellRouteWithoutBaseHref = appShellRoute
    ? addLeadingSlash(getRouteWithoutBaseHref(appShellRoute, baseHrefPathnameWithLeadingSlash))
    : undefined;

  const routesToRender: { route: string; outPath: string; isAppShell: boolean }[] = [];

  for (const { route, redirectTo } of serializableRouteTreeNode) {
    // Remove the base href from the file output path.
    const routeWithoutBaseHref = getRouteWithoutBaseHref(route, baseHrefPathnameWithLeadingSlash);
    let outPath = getRouteOutPath(routeWithoutBaseHref, PrerenderFormat.Directory);

    if (format === PrerenderFormat.File) {
      const filePath = getRouteOutPath(routeWithoutBaseHref, PrerenderFormat.File);
      const reason = getFileFormatConflict(
        routeWithoutBaseHref,
        route,
        filePath,
        lowerIndexOutput,
        usedFiles,
      );
      if (reason) {
        warnings.push(`Route '${route}' is written to '${outPath}' because ${reason}.`);
      } else {
        usedFiles.set(filePath.toLowerCase(), route);
        outPath = filePath;
      }
    }

    outPaths.set(route, outPath);

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
      warnings,
      output,
      outPaths,
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
    warnings,
    output,
    outPaths,
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

/**
 * Normalizes a route path to a leading slash and no trailing slash, e.g. `foo/./bar/` to `/foo/bar`.
 */
function getNormalizedRoutePath(route: string): string {
  return stripTrailingSlash(posix.normalize(addLeadingSlash(route)));
}

/**
 * Returns the output file path of a prerendered route, relative to the browser output directory.
 * The route must not include the `baseHref` option.
 *
 * - `directory`: `/foo/bar` is written to `foo/bar/index.html`.
 * - `file`: `/foo/bar` is written to `foo/bar.html`.
 *
 * The root route (after removing the `baseHref` option) is written to `index.html` in both formats,
 * so that the entry page of the application and of each locale is served for its base path.
 */
function getRouteOutPath(routeWithoutBaseHref: string, format: PrerenderFormat): string {
  if (format === PrerenderFormat.File) {
    const routePath = getNormalizedRoutePath(routeWithoutBaseHref);
    if (routePath !== '/') {
      return `${stripLeadingSlash(routePath)}.html`;
    }
  }

  return stripLeadingSlash(posix.join(routeWithoutBaseHref, 'index.html'));
}

/**
 * Returns why a route cannot be written to `filePath` in the 'file' format, or `undefined` if it can.
 * Such a route keeps the 'directory' format.
 */
function getFileFormatConflict(
  routeWithoutBaseHref: string,
  route: string,
  filePath: string,
  lowerIndexOutput: string | undefined,
  usedFiles: ReadonlyMap<string, string>,
): string | undefined {
  const routePath = getNormalizedRoutePath(routeWithoutBaseHref);
  if (routePath === '/') {
    return undefined;
  }

  // 'index.html' is served for the parent path, and on case-insensitive file systems
  // 'Index.html' is the same file.
  if (posix.basename(routePath).toLowerCase() === 'index') {
    const parentPath = addTrailingSlash(posix.dirname(getNormalizedRoutePath(route)));

    return `'${filePath}' would be served for '${parentPath}'`;
  }

  const lowerFilePath = filePath.toLowerCase();
  if (lowerIndexOutput !== undefined && lowerFilePath === lowerIndexOutput) {
    return `'${filePath}' is the index file of the application`;
  }

  const existingRoute = usedFiles.get(lowerFilePath);
  if (existingRoute !== undefined) {
    return `'${filePath}' is already used by route '${existingRoute}'`;
  }

  return undefined;
}
