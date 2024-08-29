/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFile } from 'node:fs/promises';
import { extname, join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import Piscina from 'piscina';
import { BuildOutputFile, BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import { BuildOutputAsset } from '../../tools/esbuild/bundler-execution-result';
import { urlJoin } from '../url';
import type { RenderWorkerData } from './render-worker';
import type {
  RoutesExtractorWorkerData,
  RoutersExtractorWorkerResult as SerializableRouteTreeNode,
} from './routes-extractor-worker';

interface PrerenderOptions {
  routesFile?: string;
  discoverRoutes?: boolean;
}

interface AppShellOptions {
  route?: string;
}

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
  appShellOptions: AppShellOptions = {},
  prerenderOptions: PrerenderOptions = {},
  outputFiles: Readonly<BuildOutputFile[]>,
  assets: Readonly<BuildOutputAsset[]>,
  sourcemap = false,
  maxThreads = 1,
  verbose = false,
): Promise<{
  output: PrerenderOutput;
  warnings: string[];
  errors: string[];
  prerenderedRoutes: Set<string>;
  serializableRouteTreeNode: SerializableRouteTreeNode;
}> {
  const outputFilesForWorker: Record<string, string> = {};
  const serverBundlesSourceMaps = new Map<string, string>();
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const { text, path, type } of outputFiles) {
    if (type !== BuildOutputFileType.Server) {
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
    routes: allRoutes,
    warnings: routesWarnings,
    errors: routesErrors,
    serializableRouteTreeNode,
  } = await getAllRoutes(
    workspaceRoot,
    baseHref,
    outputFilesForWorker,
    assetsReversed,
    appShellOptions,
    prerenderOptions,
    sourcemap,
    verbose,
  );

  if (routesErrors?.length) {
    errors.push(...routesErrors);
  }

  if (routesWarnings?.length) {
    warnings.push(...routesWarnings);
  }

  if (allRoutes.size < 1 || errors.length > 0) {
    return {
      errors,
      warnings,
      output: {},
      serializableRouteTreeNode,
      prerenderedRoutes: allRoutes,
    };
  }

  // Render routes
  const { errors: renderingErrors, output } = await renderPages(
    baseHref,
    sourcemap,
    allRoutes,
    maxThreads,
    workspaceRoot,
    outputFilesForWorker,
    assetsReversed,
    appShellOptions,
  );

  errors.push(...renderingErrors);

  return {
    errors,
    warnings,
    output,
    serializableRouteTreeNode,
    prerenderedRoutes: allRoutes,
  };
}

class RoutesSet extends Set<string> {
  override add(value: string): this {
    return super.add(addLeadingSlash(value));
  }
}

async function renderPages(
  baseHref: string,
  sourcemap: boolean,
  allRoutes: Set<string>,
  maxThreads: number,
  workspaceRoot: string,
  outputFilesForWorker: Record<string, string>,
  assetFilesForWorker: Record<string, string>,
  appShellOptions: AppShellOptions,
): Promise<{
  output: PrerenderOutput;
  errors: string[];
}> {
  const output: PrerenderOutput = {};
  const errors: string[] = [];

  const workerExecArgv = [
    '--import',
    // Loader cannot be an absolute path on Windows.
    pathToFileURL(join(__dirname, 'esm-in-memory-loader/register-hooks.js')).href,
  ];

  if (sourcemap) {
    workerExecArgv.push('--enable-source-maps');
  }

  const renderWorker = new Piscina({
    filename: require.resolve('./render-worker'),
    maxThreads: Math.min(allRoutes.size, maxThreads),
    workerData: {
      workspaceRoot,
      outputFiles: outputFilesForWorker,
      assetFiles: assetFilesForWorker,
    } as RenderWorkerData,
    execArgv: workerExecArgv,
    recordTiming: false,
  });

  try {
    const renderingPromises: Promise<void>[] = [];
    const appShellRoute = appShellOptions.route && addLeadingSlash(appShellOptions.route);
    const baseHrefWithLeadingSlash = addLeadingSlash(baseHref);

    for (const route of allRoutes) {
      // Remove base href from file output path.
      const routeWithoutBaseHref = addLeadingSlash(
        route.slice(baseHrefWithLeadingSlash.length - 1),
      );

      const isAppShellRoute = appShellRoute === routeWithoutBaseHref;
      const render: Promise<string | null> = renderWorker.run({ url: route, isAppShellRoute });
      const renderResult: Promise<void> = render
        .then((content) => {
          if (content !== null) {
            const outPath = posix.join(removeLeadingSlash(routeWithoutBaseHref), 'index.html');
            output[outPath] = { content, appShellRoute: isAppShellRoute };
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
  appShellOptions: AppShellOptions,
  prerenderOptions: PrerenderOptions,
  sourcemap: boolean,
  verbose: boolean,
): Promise<{
  routes: Set<string>;
  warnings?: string[];
  errors?: string[];
  serializableRouteTreeNode: SerializableRouteTreeNode;
}> {
  const { routesFile, discoverRoutes } = prerenderOptions;
  const routes = new RoutesSet();
  const { route: appShellRoute } = appShellOptions;

  if (appShellRoute !== undefined) {
    routes.add(urlJoin(baseHref, appShellRoute));
  }

  if (routesFile) {
    const routesFromFile = (await readFile(routesFile, 'utf8')).split(/\r?\n/);
    for (const route of routesFromFile) {
      routes.add(urlJoin(baseHref, route.trim()));
    }
  }

  if (!discoverRoutes) {
    return { routes, serializableRouteTreeNode: [] };
  }

  const workerExecArgv = [
    '--import',
    // Loader cannot be an absolute path on Windows.
    pathToFileURL(join(__dirname, 'esm-in-memory-loader/register-hooks.js')).href,
  ];

  if (sourcemap) {
    workerExecArgv.push('--enable-source-maps');
  }

  const renderWorker = new Piscina({
    filename: require.resolve('./routes-extractor-worker'),
    maxThreads: 1,
    workerData: {
      workspaceRoot,
      outputFiles: outputFilesForWorker,
      assetFiles: assetFilesForWorker,
    } as RoutesExtractorWorkerData,
    execArgv: workerExecArgv,
    recordTiming: false,
  });

  const errors: string[] = [];
  const serializableRouteTreeNode: SerializableRouteTreeNode = await renderWorker
    .run({})
    .catch((err) => {
      errors.push(`An error occurred while extracting routes.\n\n${err.stack}`);
    })
    .finally(() => {
      void renderWorker.destroy();
    });

  const skippedRedirects: string[] = [];
  const skippedOthers: string[] = [];
  for (const { route, redirectTo } of serializableRouteTreeNode) {
    if (redirectTo) {
      skippedRedirects.push(route);
    } else if (route.includes('*')) {
      skippedOthers.push(route);
    } else {
      routes.add(route);
    }
  }

  let warnings: string[] | undefined;
  if (verbose) {
    if (skippedOthers.length) {
      (warnings ??= []).push(
        'The following routes were skipped from prerendering because they contain routes with dynamic parameters:\n' +
          skippedOthers.join('\n'),
      );
    }

    if (skippedRedirects.length) {
      (warnings ??= []).push(
        'The following routes were skipped from prerendering because they contain redirects:\n',
        skippedRedirects.join('\n'),
      );
    }
  }

  return { routes, serializableRouteTreeNode, warnings };
}

function addLeadingSlash(value: string): string {
  return value.charAt(0) === '/' ? value : '/' + value;
}

function removeLeadingSlash(value: string): string {
  return value.charAt(0) === '/' ? value.slice(1) : value;
}
