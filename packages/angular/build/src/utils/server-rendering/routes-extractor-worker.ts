/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workerData } from 'worker_threads';
import { OutputMode } from '../../builders/application/schema';
import { ESMInMemoryFileLoaderWorkerData } from './esm-in-memory-loader/loader-hooks';
import { patchFetchToLoadInMemoryAssets } from './fetch-patch';
import { DEFAULT_URL, launchServer } from './launch-server';
import { loadEsmModuleFromMemory } from './load-esm-from-memory';
import { RoutersExtractorWorkerResult } from './models';

export interface ExtractRoutesWorkerData extends ESMInMemoryFileLoaderWorkerData {
  outputMode: OutputMode | undefined;
}

/**
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const { outputMode, hasSsrEntry } = workerData as {
  outputMode: OutputMode | undefined;
  hasSsrEntry: boolean;
};

/** Renders an application based on a provided options. */
async function extractRoutes(): Promise<RoutersExtractorWorkerResult> {
  const serverURL = outputMode !== undefined && hasSsrEntry ? await launchServer() : DEFAULT_URL;

  patchFetchToLoadInMemoryAssets(serverURL);

  const { ɵextractRoutesAndCreateRouteTree: extractRoutesAndCreateRouteTree } =
    await loadEsmModuleFromMemory('./main.server.mjs');

  const { routeTree, appShellRoute, errors } = await extractRoutesAndCreateRouteTree(
    serverURL,
    undefined /** manifest */,
    true /** invokeGetPrerenderParams */,
    outputMode === OutputMode.Server /** includePrerenderFallbackRoutes */,
  );

  return {
    errors,
    appShellRoute,
    serializedRouteTree: routeTree.toObject(),
  };
}

export default extractRoutes;
