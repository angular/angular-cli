/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { MessageChannel, workerData } from 'node:worker_threads';
import { isLegacyESMLoaderImplementation } from './utils-lts-node';

if (isLegacyESMLoaderImplementation && workerData) {
  /** TODO: Remove when Node.js versions < 22.2 are no longer supported. */
  register('./loader-hooks.js', {
    parentURL: pathToFileURL(__filename),
    data: workerData,
  });
} else {
  const { port1, port2 } = new MessageChannel();

  process.once('message', (msg) => {
    port1.postMessage(msg);
    port1.close();
  });

  register('./loader-hooks.js', {
    parentURL: pathToFileURL(__filename),
    data: { port: port2 },
    transferList: [port2],
  });
}
