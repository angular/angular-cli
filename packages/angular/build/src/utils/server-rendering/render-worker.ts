/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { workerData } from 'node:worker_threads';
import { patchFetchToLoadInMemoryAssets } from './fetch-patch';
import { RenderResult, ServerContext, renderPage } from './render-page';

export interface RenderWorkerData {
  document: string;
  inlineCriticalCss?: boolean;
  assetFiles: Record</** Destination */ string, /** Source */ string>;
  cssOutputFilesForWorker: Record<string, string>;
  /**
   * Only defined when Node.js version is < 22.2.
   * TODO: Remove when Node.js versions < 22.2 are no longer supported.
   */
  jsOutputFilesForWorker: Record<string, string>;
  /**
   * Only defined when Node.js version is < 22.2.
   * TODO: Remove when Node.js versions < 22.2 are no longer supported.
   */
  workspaceRoot: string;
}

export interface RenderOptions {
  route: string;
  serverContext: ServerContext;
}

/**
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const {
  cssOutputFilesForWorker: outputFiles,
  document,
  inlineCriticalCss,
} = workerData as RenderWorkerData;

/** Renders an application based on a provided options. */
function render(options: RenderOptions): Promise<RenderResult> {
  return renderPage({
    ...options,
    outputFiles,
    document,
    inlineCriticalCss,
  });
}

function initialize() {
  patchFetchToLoadInMemoryAssets();

  return render;
}

export default initialize();
