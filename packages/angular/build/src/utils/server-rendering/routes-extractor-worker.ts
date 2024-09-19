/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { OutputMode } from '../../builders/application/schema';
import { patchFetchToLoadInMemoryAssets } from './fetch-patch';
import { loadEsmModuleFromMemory } from './load-esm-from-memory';
import { RoutersExtractorWorkerResult } from './models';

export interface ExtractRoutesOptions {
  outputMode?: OutputMode;
}

/** Renders an application based on a provided options. */
async function extractRoutes({
  outputMode,
}: ExtractRoutesOptions): Promise<RoutersExtractorWorkerResult> {
  const { ɵextractRoutesAndCreateRouteTree: extractRoutesAndCreateRouteTree } =
    await loadEsmModuleFromMemory('./main.server.mjs');

  const { routeTree, errors } = await extractRoutesAndCreateRouteTree(
    new URL('http://local-angular-prerender/'),
    undefined /** manifest */,
    true /** invokeGetPrerenderParams */,
    outputMode === OutputMode.Server /** includePrerenderFallbackRoutes */,
  );

  return {
    errors,
    serializedRouteTree: routeTree.toObject(),
  };
}

function initialize() {
  patchFetchToLoadInMemoryAssets();

  return extractRoutes;
}

export default initialize();
