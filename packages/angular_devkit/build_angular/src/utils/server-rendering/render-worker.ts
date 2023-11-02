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
import { RenderResult, ServerContext, renderPage } from './render-page';

export interface RenderWorkerData extends ESMInMemoryFileLoaderWorkerData {
  document: string;
  inlineCriticalCss?: boolean;
  assetFiles: Record</** Destination */ string, /** Source */ string>;
}

export interface RenderOptions {
  route: string;
  serverContext: ServerContext;
}

/**
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const { outputFiles, document, inlineCriticalCss } = workerData as RenderWorkerData;

/** Renders an application based on a provided options. */
function render(options: RenderOptions): Promise<RenderResult> {
  return renderPage({
    ...options,
    outputFiles,
    document,
    inlineCriticalCss,
    loadBundle: async (path) => await loadEsmModule(new URL(path, 'memory://')),
  });
}

function initialize() {
  patchFetchToLoadInMemoryAssets();

  return render;
}

export default initialize();
