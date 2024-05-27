/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import Piscina from 'piscina';
import { BuildOutputAsset } from '../../tools/esbuild/bundler-execution-result';
import { isLegacyESMLoaderImplementation } from './esm-in-memory-loader/utils-lts-node';
import { AppShellOptions, PrerenderOptions } from './prerender';
import type { RenderResult, ServerContext } from './render-page';
import type { RenderWorkerData } from './render-worker';
import type {
  RoutersExtractorWorkerResult,
  RoutesExtractorWorkerData,
} from './routes-extractor-worker';

export interface ReadyMessage {
  type: 'ready';
  data: {
    output: Record<string, string>;
    warnings: string[];
    errors: string[];
    prerenderedRoutes: string[];
  };
}

export interface ErrorMessage {
  type: 'error';
  data: {
    name: string;
    message: string;
    stack: string;
  };
}

export interface StartMessage {
  type: 'start';
  data: null;
}

export type ProcessMessages = ErrorMessage | ReadyMessage | StartMessage;

export interface PrerenderPagesOptions {
  appShellOptions: AppShellOptions;
  prerenderOptions: PrerenderOptions;
  assets: Readonly<BuildOutputAsset[]>;
  document: string;
  sourcemap: boolean;
  inlineCriticalCss: boolean;
  maxThreads: number;
  verbose: boolean;
  cssOutputFilesForWorker?: Record<string, string>;
  /**
   * Only defined when Node.js version is < 22.2.
   * TODO: Remove when Node.js versions < 22.2 are no longer supported.
   */
  jsOutputFilesForWorker?: Record<string, string>;
  /**
   * Only defined when Node.js version is < 22.2.
   * TODO: Remove when Node.js versions < 22.2 are no longer supported.
   */
  workspaceRoot?: string;
}

class RoutesSet extends Set<string> {
  override add(value: string): this {
    return super.add(addLeadingSlash(value));
  }
}

async function prerenderPages({
  appShellOptions,
  prerenderOptions,
  assets,
  document,
  sourcemap,
  inlineCriticalCss,
  maxThreads,
  verbose,
  workspaceRoot,
  cssOutputFilesForWorker,
  jsOutputFilesForWorker,
}: PrerenderPagesOptions): Promise<{
  output: Record<string, string>;
  warnings: string[];
  errors: string[];
  prerenderedRoutes: string[];
}> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const assetsReversed: Record</** Destination */ string, /** Source */ string> = {};
  for (const { source, destination } of assets) {
    assetsReversed[addLeadingSlash(destination.replace(/\\/g, posix.sep))] = source;
  }

  // Get routes to prerender
  const { routes: allRoutes, warnings: routesWarnings } = await getAllRoutes(
    assetsReversed,
    document,
    appShellOptions,
    prerenderOptions,
    sourcemap,
    verbose,
    jsOutputFilesForWorker,
    workspaceRoot,
  );

  if (routesWarnings?.length) {
    warnings.push(...routesWarnings);
  }

  if (allRoutes.length < 1) {
    return {
      errors,
      warnings,
      output: {},
      prerenderedRoutes: allRoutes,
    };
  }

  // Render routes
  const {
    warnings: renderingWarnings,
    errors: renderingErrors,
    output,
  } = await renderPages(
    sourcemap,
    allRoutes,
    maxThreads,
    assetsReversed,
    inlineCriticalCss,
    document,
    appShellOptions,
    cssOutputFilesForWorker,
    jsOutputFilesForWorker,
    workspaceRoot,
  );

  errors.push(...renderingErrors);
  warnings.push(...renderingWarnings);

  return {
    errors,
    warnings,
    output,
    prerenderedRoutes: allRoutes,
  };
}

async function renderPages(
  sourcemap: boolean,
  allRoutes: string[],
  maxThreads: number,
  assetFilesForWorker: Record<string, string>,
  inlineCriticalCss: boolean,
  document: string,
  appShellOptions: AppShellOptions,
  cssOutputFilesForWorker?: Record<string, string>,
  /**
   * Only defined when Node.js version is < 22.2.
   * TODO: Remove when Node.js versions < 22.2 are no longer supported.
   */
  jsOutputFilesForWorker?: Record<string, string>,
  /**
   * Only defined when Node.js version is < 22.2.
   * TODO: Remove when Node.js versions < 22.2 are no longer supported.
   */
  workspaceRoot?: string,
): Promise<{
  output: Record<string, string>;
  warnings: string[];
  errors: string[];
}> {
  const output: Record<string, string> = {};
  const warnings: string[] = [];
  const errors: string[] = [];
  const execArgv: string[] = sourcemap
    ? ['--enable-source-maps', ...process.execArgv]
    : [...process.execArgv];

  if (isLegacyESMLoaderImplementation) {
    execArgv.push(
      '--import',
      // Loader cannot be an absolute path on Windows.
      pathToFileURL(join(__dirname, 'esm-in-memory-loader/register-hooks.js')).href,
    );
  }

  const renderWorker = new Piscina({
    filename: join(__dirname, 'render-worker.js'),
    maxThreads: Math.min(allRoutes.length, maxThreads),
    workerData: {
      assetFiles: assetFilesForWorker,
      inlineCriticalCss,
      document,
      jsOutputFilesForWorker,
      cssOutputFilesForWorker,
      workspaceRoot,
    } as RenderWorkerData,
    execArgv,
    recordTiming: false,
  });

  try {
    const renderingPromises: Promise<void>[] = [];
    const appShellRoute = appShellOptions.route && addLeadingSlash(appShellOptions.route);

    for (const route of allRoutes) {
      const isAppShellRoute = appShellRoute === route;
      const serverContext: ServerContext = isAppShellRoute ? 'app-shell' : 'ssg';
      const render: Promise<RenderResult> = renderWorker.run({ route, serverContext });
      const renderResult: Promise<void> = render.then(({ content, warnings, errors }) => {
        if (content !== undefined) {
          const outPath = isAppShellRoute
            ? 'index.html'
            : posix.join(removeLeadingSlash(route), 'index.html');
          output[outPath] = content;
        }

        if (warnings) {
          warnings.push(...warnings);
        }

        if (errors) {
          errors.push(...errors);
        }
      });

      renderingPromises.push(renderResult);
    }

    await Promise.all(renderingPromises);
  } finally {
    void renderWorker.destroy();
  }

  return {
    errors,
    warnings,
    output,
  };
}

async function getAllRoutes(
  assetFilesForWorker: Record<string, string>,
  document: string,
  appShellOptions: AppShellOptions,
  prerenderOptions: PrerenderOptions,
  sourcemap: boolean,
  verbose: boolean,
  /**
   * Only defined when Node.js version is < 22.2.
   * TODO: Remove when Node.js versions < 22.2 are no longer supported.
   */
  jsOutputFilesForWorker?: Record<string, string>,
  /**
   * Only defined when Node.js version is < 22.2.
   * TODO: Remove when Node.js versions < 22.2 are no longer supported.
   */
  workspaceRoot?: string,
): Promise<{ routes: string[]; warnings?: string[] }> {
  const { routesFile, discoverRoutes } = prerenderOptions;
  const routes = new RoutesSet();
  const { route: appShellRoute } = appShellOptions;

  if (appShellRoute !== undefined) {
    routes.add(appShellRoute);
  }

  if (routesFile) {
    const routesFromFile = (await readFile(routesFile, 'utf8')).split(/\r?\n/);
    for (const route of routesFromFile) {
      routes.add(route.trim());
    }
  }

  if (!discoverRoutes) {
    return { routes: Array.from(routes) };
  }

  const execArgv: string[] = sourcemap
    ? ['--enable-source-maps', ...process.execArgv]
    : [...process.execArgv];
  if (isLegacyESMLoaderImplementation) {
    execArgv.push(
      '--import',
      // Loader cannot be an absolute path on Windows.
      pathToFileURL(join(__dirname, 'esm-in-memory-loader/register-hooks.js')).href,
    );
  }

  const renderWorker = new Piscina({
    filename: join(__dirname, 'routes-extractor-worker.js'),
    maxThreads: 1,
    workerData: {
      assetFiles: assetFilesForWorker,
      document,
      verbose,
      jsOutputFilesForWorker,
      workspaceRoot,
    } as RoutesExtractorWorkerData,
    execArgv,
    recordTiming: false,
  });

  const { routes: extractedRoutes, warnings }: RoutersExtractorWorkerResult = await renderWorker
    .run({})
    .finally(() => {
      void renderWorker.destroy();
    });

  extractedRoutes.forEach((route) => routes.add(route));

  return { routes: Array.from(routes), warnings };
}

function removeLeadingSlash(value: string): string {
  return value.charAt(0) === '/' ? value.slice(1) : value;
}

function addLeadingSlash(value: string): string {
  return value.charAt(0) === '/' ? value : '/' + value;
}

process
  .once('message', (options: PrerenderPagesOptions) => {
    prerenderPages(options)
      .then((result) => {
        process.send?.({
          type: 'ready',
          data: result,
        } as ReadyMessage);
      })
      .catch((err) => {
        process.send?.({
          type: 'error',
          data: { name: err.name, message: err.message, stack: err.stack },
        } as ErrorMessage);
      });
  })
  .send?.({ type: 'start', data: null } as StartMessage);
