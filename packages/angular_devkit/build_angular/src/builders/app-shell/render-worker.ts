/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Type } from '@angular/core';
import type * as platformServer from '@angular/platform-server';
import assert from 'node:assert';
import { workerData } from 'node:worker_threads';

/**
 * The fully resolved path to the zone.js package that will be loaded during worker initialization.
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const { zonePackage } = workerData as {
  zonePackage: string;
};

/**
 * A request to render a Server bundle generate by the universal server builder.
 */
interface RenderRequest {
  /**
   * The path to the server bundle that should be loaded and rendered.
   */
  serverBundlePath: string;
  /**
   * The existing HTML document as a string that will be augmented with the rendered application.
   */
  document: string;
  /**
   * An optional URL path that represents the Angular route that should be rendered.
   */
  url: string | undefined;
}

/**
 * Renders an application based on a provided server bundle path, initial document, and optional URL route.
 * @param param0 A request to render a server bundle.
 * @returns A promise that resolves to the render HTML document for the application.
 */
async function render({ serverBundlePath, document, url }: RenderRequest): Promise<string> {
  const { AppServerModule, renderModule, ɵSERVER_CONTEXT } = (await import(serverBundlePath)) as {
    renderModule: typeof platformServer.renderModule | undefined;
    ɵSERVER_CONTEXT: typeof platformServer.ɵSERVER_CONTEXT | undefined;
    AppServerModule: Type<unknown> | undefined;
  };

  assert(renderModule, `renderModule was not exported from: ${serverBundlePath}.`);
  assert(AppServerModule, `AppServerModule was not exported from: ${serverBundlePath}.`);
  assert(ɵSERVER_CONTEXT, `ɵSERVER_CONTEXT was not exported from: ${serverBundlePath}.`);

  // Render platform server module
  const html = await renderModule(AppServerModule, {
    document,
    url,
    extraProviders: [
      {
        provide: ɵSERVER_CONTEXT,
        useValue: 'app-shell',
      },
    ],
  });

  return html;
}

/**
 * Initializes the worker when it is first created by loading the Zone.js package
 * into the worker instance.
 *
 * @returns A promise resolving to the render function of the worker.
 */
async function initialize() {
  // Setup Zone.js
  await import(zonePackage);

  // Return the render function for use
  return render;
}

/**
 * The default export will be the promise returned by the initialize function.
 * This is awaited by piscina prior to using the Worker.
 */
export default initialize();
