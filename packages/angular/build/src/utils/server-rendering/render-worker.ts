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
  isAppShellRoute: boolean;
}

/**
 * Renders each route in routes and writes them to <outputPath>/<route>/index.html.
 */
async function renderPage({ url, isAppShellRoute }: RenderOptions): Promise<string | null> {
  const {
    ɵgetOrCreateAngularServerApp: getOrCreateAngularServerApp,
    ɵServerRenderContext: ServerRenderContext,
  } = await loadEsmModuleFromMemory('./main.server.mjs');
  const angularServerApp = getOrCreateAngularServerApp();
  const response = await angularServerApp.render(
    new Request(new URL(url, 'http://local-angular-prerender'), {
      signal: AbortSignal.timeout(30_000),
    }),
    undefined,
    isAppShellRoute ? ServerRenderContext.AppShell : ServerRenderContext.SSG,
  );

  return response ? response.text() : null;
}

function initialize() {
  patchFetchToLoadInMemoryAssets();

  return renderPage;
}

export default initialize();
