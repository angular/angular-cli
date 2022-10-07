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

const { zonePackage } = workerData as {
  zonePackage: string;
};

interface RenderRequest {
  serverBundlePath: string;
  document: string;
  url: string | undefined;
}

async function render({ serverBundlePath, document, url }: RenderRequest): Promise<string> {
  const { AppServerModule, renderModule, ɵSERVER_CONTEXT } = (await import(serverBundlePath)) as {
    renderModule: typeof platformServer.renderModule | undefined;
    ɵSERVER_CONTEXT: typeof platformServer.ɵSERVER_CONTEXT | undefined;
    AppServerModule: Type<unknown> | undefined;
  };

  assert(renderModule, `renderModule was not exported from: ${serverBundlePath}.`);
  assert(AppServerModule, `AppServerModule was not exported from: ${serverBundlePath}.`);
  assert(ɵSERVER_CONTEXT, `ɵSERVER_CONTEXT was not exported from: ${serverBundlePath}.`);

  // Load platform server module renderer
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

async function initialize() {
  // Setup Zone.js
  await import(zonePackage);

  // return the render function for use
  return render;
}

export default initialize();
