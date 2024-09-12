/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ESMInMemoryFileLoaderWorkerData } from './esm-in-memory-loader/loader-hooks';
import { patchFetchToLoadInMemoryAssets } from './fetch-patch';
import { loadEsmModuleFromMemory } from './load-esm-from-memory';

export interface RenderWorkerData extends ESMInMemoryFileLoaderWorkerData {
  assetFiles: Record</** Destination */ string, /** Source */ string>;
}

export interface RenderOptions {
  url: string;
}

/**
 * Renders each route in routes and writes them to <outputPath>/<route>/index.html.
 */
async function renderPage({ url }: RenderOptions): Promise<string | null> {
  const { ɵgetOrCreateAngularServerApp: getOrCreateAngularServerApp } =
    await loadEsmModuleFromMemory('./main.server.mjs');
  const angularServerApp = getOrCreateAngularServerApp();
  const response = await angularServerApp.renderStatic(
    new URL(url, 'http://local-angular-prerender'),
    AbortSignal.timeout(30_000),
  );

  return response ? response.text() : null;
}

function initialize() {
  patchFetchToLoadInMemoryAssets();

  return renderPage;
}

export default initialize();
