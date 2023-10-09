/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { workerData } from 'node:worker_threads';
import type { ESMInMemoryFileLoaderWorkerData } from './esm-in-memory-loader/loader-hooks';
import { RenderResult, ServerContext, renderPage } from './render-page';

export interface RenderWorkerData extends ESMInMemoryFileLoaderWorkerData {
  document: string;
  inlineCriticalCss?: boolean;
}

export interface RenderOptions {
  route: string;
  serverContext: ServerContext;
}

/**
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const { outputFiles, document, inlineCriticalCss } = workerData as RenderWorkerData;

export default function (options: RenderOptions): Promise<RenderResult> {
  return renderPage({ ...options, outputFiles, document, inlineCriticalCss });
}
