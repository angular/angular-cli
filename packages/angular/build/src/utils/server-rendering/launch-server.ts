/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type * as AngularSsrNode from '@angular/ssr/node' with { 'resolution-mode': 'import' };
import assert from 'node:assert';
import { createServer } from 'node:http';
import { loadEsmModule } from '../load-esm';
import { loadEsmModuleFromMemory } from './load-esm-from-memory';
import { isSsrNodeRequestHandler, isSsrRequestHandler } from './utils';

export const DEFAULT_URL = new URL('http://ng-localhost/');

/**
 * Launches a server that handles local requests.
 *
 * @returns A promise that resolves to the URL of the running server.
 */
export async function launchServer(): Promise<URL> {
  const { reqHandler } = await loadEsmModuleFromMemory('./server.mjs');
  const { createWebRequestFromNodeRequest, writeResponseToNodeResponse } =
    await loadEsmModule<typeof AngularSsrNode>('@angular/ssr/node');

  if (!isSsrNodeRequestHandler(reqHandler) && !isSsrRequestHandler(reqHandler)) {
    return DEFAULT_URL;
  }

  const server = createServer((req, res) => {
    (async () => {
      // handle request
      if (isSsrNodeRequestHandler(reqHandler)) {
        await reqHandler(req, res, (e) => {
          throw e ?? new Error(`Unable to handle request: '${req.url}'.`);
        });
      } else {
        const webRes = await reqHandler(createWebRequestFromNodeRequest(req));
        if (webRes) {
          await writeResponseToNodeResponse(webRes, res);
        } else {
          res.statusCode = 501;
          res.end('Not Implemented.');
        }
      }
    })().catch((e) => {
      res.statusCode = 500;
      res.end('Internal Server Error.');
      // eslint-disable-next-line no-console
      console.error(e);
    });
  });

  server.unref();

  await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));

  const serverAddress = server.address();
  assert(serverAddress, 'Server address should be defined.');
  assert(typeof serverAddress !== 'string', 'Server address should not be a string.');

  return new URL(`http://localhost:${serverAddress.port}/`);
}
