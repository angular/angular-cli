/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ɵextractRoutesAndCreateRouteTree } from '@angular/ssr';
import type { ESMInMemoryFileLoaderWorkerData } from './esm-in-memory-loader/loader-hooks';
import { patchFetchToLoadInMemoryAssets } from './fetch-patch';
import { loadEsmModuleFromMemory } from './load-esm-from-memory';

export interface RoutesExtractorWorkerData extends ESMInMemoryFileLoaderWorkerData {
  assetFiles: Record</** Destination */ string, /** Source */ string>;
}

export type RoutersExtractorWorkerResult = ReturnType<
  Awaited<ReturnType<typeof ɵextractRoutesAndCreateRouteTree>>['toObject']
>;

/** Renders an application based on a provided options. */
async function extractRoutes(): Promise<RoutersExtractorWorkerResult> {
  const { ɵextractRoutesAndCreateRouteTree: extractRoutesAndCreateRouteTree } =
    await loadEsmModuleFromMemory('./main.server.mjs');

  const routeTree = await extractRoutesAndCreateRouteTree(
    new URL('http://local-angular-prerender/'),
  );

  return routeTree.toObject();
}

function initialize() {
  patchFetchToLoadInMemoryAssets();

  return extractRoutes;
}

export default initialize();
