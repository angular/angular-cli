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
import { BuildOutputFile, BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import { BuildOutputAsset } from '../../tools/esbuild/bundler-execution-result';
import { assertIsError } from '../error';
import { urlJoin } from '../url';
import { WorkerPool } from '../worker-pool';
import { IMPORT_EXEC_ARGV } from './esm-in-memory-loader/utils';
import { SERVER_APP_MANIFEST_FILENAME } from './manifest';
import {
  RouteRenderMode,
  RoutersExtractorWorkerResult,
  RoutesExtractorWorkerData,
  SerializableRouteTreeNode,
  WritableSerializableRouteTreeNode,
} from './models';
import type { RenderWorkerData } from './render-worker';

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
  serializableRouteTreeNode: SerializableRouteTreeNode;
}> {
  const outputFilesForWorker: Record<string, string> = {};
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
      outputFilesForWorker[path] = text;
    }
  }

  // Inline sourcemap into JS file. This is needed to make Node.js resolve sourcemaps
  // when using `--enable-source-maps` when using in memory files.
  for (const [filePath, map] of serverBundlesSourceMaps) {
    const jsContent = outputFilesForWorker[filePath];
    if (jsContent) {
      outputFilesForWorker[filePath] =
        jsContent +
        `\n//# sourceMappingURL=` +
        `data:application/json;base64,${Buffer.from(map).toString('base64')}`;
    }
  }
  serverBundlesSourceMaps.clear();

  const assetsReversed: Record</** Destination */ string, /** Source */ string> = {};
  for (const { source, destination } of assets) {
    assetsReversed[addLeadingSlash(destination.replace(/\\/g, posix.sep))] = source;
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
    return {
      errors: [`An error occurred while extracting routes.\n\n${err.stack ?? err.message ?? err}`],
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
      serializableRouteTreeNode,
    };
  }

  // Add the extracted routes to the manifest file.
  // We could re-generate it from the start, but that would require a number of options to be passed down.
  const manifest = outputFilesForWorker[SERVER_APP_MANIFEST_FILENAME];
  if (manifest) {
    outputFilesForWorker[SERVER_APP_MANIFEST_FILENAME] = manifest.replace(
      'routes: undefined,',
      `routes: ${JSON.stringify(serializableRouteTreeNodeForPrerender, undefined, 2)},`,
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

  return {
    errors,
    warnings,
    output,
    serializableRouteTreeNode,
  };
}

async function renderPages(
  baseHref: string,
  sourcemap: boolean,
  serializableRouteTreeNode: SerializableRouteTreeNode,
  maxThreads: number,
  workspaceRoot: string,
  outputFilesForWorker: Record<string, string>,
  assetFilesForWorker: Record<string, string>,
  outputMode: OutputMode | undefined,
  appShellRoute: string | undefined,
): Promise<{
  output: PrerenderOutput;
  errors: string[];
}> {
  const output: PrerenderOutput = {};
  const errors: string[] = [];
  const workerExecArgv = [IMPORT_EXEC_ARGV];

  if (sourcemap) {
    workerExecArgv.push('--enable-source-maps');
  }

  const renderWorker = new WorkerPool({
    filename: require.resolve('./render-worker'),
    maxThreads: Math.min(serializableRouteTreeNode.length, maxThreads),
    workerData: {
      workspaceRoot,
      outputFiles: outputFilesForWorker,
      assetFiles: assetFilesForWorker,
      outputMode,
      hasSsrEntry: !!outputFilesForWorker['server.mjs'],
    } as RenderWorkerData,
    execArgv: workerExecArgv,
  });

  try {
    const renderingPromises: Promise<void>[] = [];
    const appShellRouteWithLeadingSlash = appShellRoute && addLeadingSlash(appShellRoute);
    const baseHrefPathnameWithLeadingSlash = new URL(baseHref, 'http://localhost').pathname;

    for (const { route, redirectTo } of serializableRouteTreeNode) {
      // Remove the base href from the file output path.
      const routeWithoutBaseHref = addTrailingSlash(route).startsWith(
        baseHrefPathnameWithLeadingSlash,
      )
        ? addLeadingSlash(route.slice(baseHrefPathnameWithLeadingSlash.length))
        : route;

      const outPath = posix.join(removeLeadingSlash(routeWithoutBaseHref), 'index.html');

      if (typeof redirectTo === 'string') {
        output[outPath] = { content: generateRedirectStaticPage(redirectTo), appShellRoute: false };

        continue;
      }

      const render: Promise<string | null> = renderWorker.run({ url: route });
      const renderResult: Promise<void> = render
        .then((content) => {
          if (content !== null) {
            output[outPath] = {
              content,
              appShellRoute: appShellRouteWithLeadingSlash === routeWithoutBaseHref,
            };
          }
        })
        .catch((err) => {
          errors.push(
            `An error occurred while prerendering route '${route}'.\n\n${err.stack ?? err.message ?? err.code ?? err}`,
          );
          void renderWorker.destroy();
        });

      renderingPromises.push(renderResult);
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
  outputFilesForWorker: Record<string, string>,
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
    appShellRoute = urlJoin(baseHref, appShellOptions.route);

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
        route: urlJoin(baseHref, route.trim()),
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

function addLeadingSlash(value: string): string {
  return value[0] === '/' ? value : '/' + value;
}

function addTrailingSlash(url: string): string {
  return url[url.length - 1] === '/' ? url : `${url}/`;
}

function removeLeadingSlash(value: string): string {
  return value[0] === '/' ? value.slice(1) : value;
}

/**
 * Generates a static HTML page with a meta refresh tag to redirect the user to a specified URL.
 *
 * This function creates a simple HTML page that performs a redirect using a meta tag.
 * It includes a fallback link in case the meta-refresh doesn't work.
 *
 * @param url - The URL to which the page should redirect.
 * @returns The HTML content of the static redirect page.
 */
function generateRedirectStaticPage(url: string): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Redirecting</title>
    <meta http-equiv="refresh" content="0; url=${url}">
  </head>
  <body>
    <pre>Redirecting to <a href="${url}">${url}</a></pre>
  </body>
</html>
`.trim();
}
