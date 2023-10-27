/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { workerData } from 'node:worker_threads';
import { loadEsmModule } from '../load-esm';
import type { ESMInMemoryFileLoaderWorkerData } from './esm-in-memory-loader/loader-hooks';
import { MainServerBundleExports, RenderUtilsServerBundleExports } from './main-bundle-exports';
import { startServer } from './prerender-server';

export interface RoutesExtractorWorkerData extends ESMInMemoryFileLoaderWorkerData {
  document: string;
  verbose: boolean;
  assetFiles: Record</** Destination */ string, /** Source */ string>;
}

export interface RoutersExtractorWorkerResult {
  routes: string[];
  warnings?: string[];
}

/**
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const { document, verbose, assetFiles } = workerData as RoutesExtractorWorkerData;
let baseUrl = '';

/** Renders an application based on a provided options. */
async function extractRoutes(): Promise<RoutersExtractorWorkerResult> {
  const { extractRoutes } = await loadEsmModule<RenderUtilsServerBundleExports>(
    './render-utils.server.mjs',
  );
  const { default: bootstrapAppFnOrModule } =
    await loadEsmModule<MainServerBundleExports>('./main.server.mjs');

  const skippedRedirects: string[] = [];
  const skippedOthers: string[] = [];
  const routes: string[] = [];

  for await (const { route, success, redirect } of extractRoutes(
    bootstrapAppFnOrModule,
    document,
    baseUrl,
  )) {
    if (success) {
      routes.push(route);
      continue;
    }

    if (redirect) {
      skippedRedirects.push(route);
    } else {
      skippedOthers.push(route);
    }
  }

  if (!verbose) {
    return { routes };
  }

  let warnings: string[] | undefined;
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

  return { routes, warnings };
}

async function initialize() {
  const { address } = await startServer(assetFiles);
  baseUrl = address;

  return extractRoutes;
}

export default initialize();
