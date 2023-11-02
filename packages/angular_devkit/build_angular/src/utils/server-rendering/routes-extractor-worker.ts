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
import { patchFetchToLoadInMemoryAssets } from './fetch-patch';
import { MainServerBundleExports, RenderUtilsServerBundleExports } from './main-bundle-exports';

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
const { document, verbose } = workerData as RoutesExtractorWorkerData;

/** Renders an application based on a provided options. */
async function extractRoutes(): Promise<RoutersExtractorWorkerResult> {
  const { extractRoutes } = await loadEsmModule<RenderUtilsServerBundleExports>(
    new URL('./render-utils.server.mjs', 'memory://'),
  );
  const { default: bootstrapAppFnOrModule } = await loadEsmModule<MainServerBundleExports>(
    new URL('./main.server.mjs', 'memory://'),
  );

  const skippedRedirects: string[] = [];
  const skippedOthers: string[] = [];
  const routes: string[] = [];

  for await (const { route, success, redirect } of extractRoutes(
    bootstrapAppFnOrModule,
    document,
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

function initialize() {
  patchFetchToLoadInMemoryAssets();

  return extractRoutes;
}

export default initialize();
