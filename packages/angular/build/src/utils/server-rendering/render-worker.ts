/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { workerData } from 'node:worker_threads';
import type { OutputMode } from '../../builders/application/schema';
import { assertIsError } from '../error';
import type { ESMInMemoryFileLoaderWorkerData } from './esm-in-memory-loader/loader-hooks';
import { patchFetchToLoadInMemoryAssets } from './fetch-patch';
import { DEFAULT_URL, launchServer } from './launch-server';
import { loadEsmModuleFromMemory } from './load-esm-from-memory';
import { generateRedirectStaticPage } from './utils';

export interface RenderWorkerData extends ESMInMemoryFileLoaderWorkerData {
  assetFiles: Record</** Destination */ string, /** Source */ string>;
  outputMode: OutputMode | undefined;
  hasSsrEntry: boolean;
}

export type RenderResultItem =
  | {
      url: string;
      content: string;
    }
  | {
      url: string;
      error: string;
    };

export type RenderResult = RenderResultItem[];

/**
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const { outputMode, hasSsrEntry } = workerData as {
  outputMode: OutputMode | undefined;
  hasSsrEntry: boolean;
};

let serverURL = DEFAULT_URL;

/**
 * Renders a single route URL.
 */
async function renderPage(
  url: string,
  angularServerApp: { handle: (request: Request) => Promise<Response | null> },
): Promise<string | null> {
  const response = await angularServerApp.handle(
    new Request(new URL(url, serverURL), { signal: AbortSignal.timeout(30_000) }),
  );

  if (!response) {
    return null;
  }

  const location = response.headers.get('Location');

  return location ? generateRedirectStaticPage(location) : response.text();
}

/**
 * Renders routes in batch or individual URL.
 */
async function renderPages(urls: string[]): Promise<RenderResult> {
  const { ɵgetOrCreateAngularServerApp: getOrCreateAngularServerApp } =
    await loadEsmModuleFromMemory('./main.server.mjs');

  const angularServerApp = getOrCreateAngularServerApp({
    allowStaticRouteRender: true,
  });

  const results: RenderResult = [];
  for (const currentUrl of urls) {
    try {
      const content = await renderPage(currentUrl, angularServerApp);

      if (content === null) {
        throw new Error('The content returned was empty.');
      }

      results.push({ url: currentUrl, content });
    } catch (err) {
      assertIsError(err);
      results.push({
        url: currentUrl,
        error: err.stack ?? err.message ?? err.code ?? `${err}`,
      });
    }
  }

  return results;
}

async function initialize() {
  // Load the compiler because `@angular/ssr/node` depends on `@angular/` packages,
  // which must be processed by the runtime linker, even if they are not used.
  await import('@angular/compiler');

  if (outputMode !== undefined && hasSsrEntry) {
    serverURL = await launchServer();
  }

  patchFetchToLoadInMemoryAssets(serverURL);

  return renderPages;
}

export default initialize();
