/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ImporterReturnType, Options, renderSync } from 'sass';
import { MessagePort, parentPort, receiveMessageOnPort, workerData } from 'worker_threads';

/**
 * A request to render a Sass stylesheet using the supplied options.
 */
interface RenderRequestMessage {
  /**
   * The unique request identifier that links the render action with a callback and optional
   * importer on the main thread.
   */
  id: number;

  /**
   * The Sass options to provide to the `dart-sass` render function.
   */
  options: Options;

  /**
   * Indicates the request has a custom importer function on the main thread.
   */
  hasImporter: boolean;

  /**
   * Indicates this is not an init message.
   */
  init: undefined;
}

interface InitMessage {
  init: true;
  workerImporterPort: MessagePort;
  importerSignal: Int32Array;
}

if (!parentPort) {
  throw new Error('Sass worker must be executed as a Worker.');
}

// The importer variables are used to proxy import requests to the main thread
let { workerImporterPort, importerSignal } = (workerData || {}) as InitMessage;

parentPort.on('message', (message: RenderRequestMessage | InitMessage) => {
  // The init message is only needed to support Node.js < 12.17 and can be removed once support is dropped
  if (message.init) {
    workerImporterPort = message.workerImporterPort;
    importerSignal = message.importerSignal;

    return;
  }

  const { id, hasImporter, options } = message;
  try {
    if (hasImporter) {
      // When a custom importer function is present, the importer request must be proxied
      // back to the main thread where it can be executed.
      // This process must be synchronous from the perspective of dart-sass. The `Atomics`
      // functions combined with the shared memory `importSignal` and the Node.js
      // `receiveMessageOnPort` function are used to ensure synchronous behavior.
      options.importer = (url, prev) => {
        Atomics.store(importerSignal, 0, 0);
        workerImporterPort.postMessage({ id, url, prev });
        Atomics.wait(importerSignal, 0, 0);

        return receiveMessageOnPort(workerImporterPort)?.message as ImporterReturnType;
      };
    }

    // The synchronous Sass render function can be up to two times faster than the async variant
    const result = renderSync(options);

    parentPort?.postMessage({ id, result });
  } catch (error) {
    parentPort?.postMessage({ id, error });
  }
});
