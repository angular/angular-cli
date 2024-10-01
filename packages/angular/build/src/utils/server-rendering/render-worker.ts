/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workerData } from 'worker_threads';
import type { OutputMode } from '../../builders/application/schema';
import type { ESMInMemoryFileLoaderWorkerData } from './esm-in-memory-loader/loader-hooks';
import { patchFetchToLoadInMemoryAssets } from './fetch-patch';
import { DEFAULT_URL, launchServer } from './launch-server';
import { loadEsmModuleFromMemory } from './load-esm-from-memory';

export interface RenderWorkerData extends ESMInMemoryFileLoaderWorkerData {
  assetFiles: Record</** Destination */ string, /** Source */ string>;
  outputMode: OutputMode | undefined;
  hasSsrEntry: boolean;
}

export interface RenderOptions {
  url: string;
}

/**
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const { outputMode, hasSsrEntry } = workerData as {
  outputMode: OutputMode | undefined;
  hasSsrEntry: boolean;
};

let serverURL = DEFAULT_URL;

/**
 * Renders each route in routes and writes them to <outputPath>/<route>/index.html.
 */
async function renderPage({ url }: RenderOptions): Promise<string | null> {
  const { ɵgetOrCreateAngularServerApp: getOrCreateAngularServerApp } =
    await loadEsmModuleFromMemory('./main.server.mjs');
  const angularServerApp = getOrCreateAngularServerApp();
  const response = await angularServerApp.renderStatic(
    new URL(url, serverURL),
    AbortSignal.timeout(30_000),
  );

  return response ? response.text() : null;
}

async function initialize() {
  if (outputMode !== undefined && hasSsrEntry) {
    serverURL = await launchServer();
  }

  patchFetchToLoadInMemoryAssets(serverURL);

  return renderPage;
}

export default initialize();
