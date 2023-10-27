/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { workerData } from 'node:worker_threads';
import type { ESMInMemoryFileLoaderWorkerData } from './esm-in-memory-loader/loader-hooks';
import { startServer } from './prerender-server';
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
const { outputFiles, document, inlineCriticalCss, assetFiles } = workerData as RenderWorkerData;

let baseUrl = '';

/** Renders an application based on a provided options. */
async function render(options: RenderOptions): Promise<RenderResult> {
  return renderPage({
    ...options,
    route: baseUrl + options.route,
    outputFiles,
    document,
    inlineCriticalCss,
  });
}

async function initialize() {
  const { address } = await startServer(assetFiles);
  baseUrl = address;

  return render;
}

export default initialize();
