/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { OutputFile } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { extname, posix } from 'node:path';
import Piscina from 'piscina';
import type { RenderResult, ServerContext } from './render-page';
import type { WorkerData } from './render-worker';

interface PrerenderOptions {
  routesFile?: string;
  discoverRoutes?: boolean;
  routes?: string[];
}

interface AppShellOptions {
  route?: string;
}

export async function prerenderPages(
  workspaceRoot: string,
  tsConfigPath: string,
  appShellOptions: AppShellOptions = {},
  prerenderOptions: PrerenderOptions = {},
  outputFiles: Readonly<OutputFile[]>,
  document: string,
  inlineCriticalCss?: boolean,
  maxThreads = 1,
): Promise<{
  output: Record<string, string>;
  warnings: string[];
  errors: string[];
}> {
  const allRoutes = await getAllRoutes(tsConfigPath, appShellOptions, prerenderOptions);
  const outputFilesForWorker: Record<string, string> = {};

  for (const { text, path } of outputFiles) {
    switch (extname(path)) {
      case '.mjs': // Contains the server runnable application code.
      case '.css': // Global styles for critical CSS inlining.
        outputFilesForWorker[path] = text;
        break;
    }
  }

  const renderWorker = new Piscina({
    filename: require.resolve('./render-worker'),
    maxThreads: Math.min(allRoutes.size, maxThreads),
    workerData: {
      workspaceRoot,
      outputFiles: outputFilesForWorker,
      inlineCriticalCss,
      document,
    } as WorkerData,
    execArgv: [
      '--no-warnings', // Suppress `ExperimentalWarning: Custom ESM Loaders is an experimental feature...`.
      '--loader',
      require.resolve('./esm-in-memory-file-loader.js'),
    ],
  });

  const output: Record<string, string> = {};
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const renderingPromises: Promise<void>[] = [];

    for (const route of allRoutes) {
      const isAppShellRoute = appShellOptions.route === route;
      const serverContext: ServerContext = isAppShellRoute ? 'app-shell' : 'ssg';

      const render: Promise<RenderResult> = renderWorker.run({ route, serverContext });
      const renderResult: Promise<void> = render.then(({ content, warnings, errors }) => {
        if (content !== undefined) {
          const outPath = isAppShellRoute
            ? 'index.html'
            : posix.join(
                route.startsWith('/') ? route.slice(1) /* Remove leading slash */ : route,
                'index.html',
              );
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
  tsConfigPath: string,
  appShellOptions: AppShellOptions,
  prerenderOptions: PrerenderOptions,
): Promise<Set<string>> {
  const { routesFile, discoverRoutes, routes: existingRoutes } = prerenderOptions;
  const routes = new Set(existingRoutes);

  const { route: appShellRoute } = appShellOptions;
  if (appShellRoute !== undefined) {
    routes.add(appShellRoute);
  }

  if (routesFile) {
    const routesFromFile = (await readFile(routesFile, 'utf8')).split(/\r?\n/);
    for (let route of routesFromFile) {
      route = route.trim();
      if (route) {
        routes.add(route);
      }
    }
  }

  if (discoverRoutes) {
    const { parseAngularRoutes } = await import('guess-parser');
    for (const { path } of parseAngularRoutes(tsConfigPath)) {
      // Exclude dynamic routes as these cannot be pre-rendered.
      if (!/[*:]/.test(path)) {
        routes.add(path);
      }
    }
  }

  return routes;
}
