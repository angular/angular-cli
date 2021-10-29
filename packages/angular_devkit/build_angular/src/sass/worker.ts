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
}

if (!parentPort || !workerData) {
  throw new Error('Sass worker must be executed as a Worker.');
}

// The importer variables are used to proxy import requests to the main thread
const { workerImporterPort, importerSignal } = workerData as {
  workerImporterPort: MessagePort;
  importerSignal: Int32Array;
};

parentPort.on('message', ({ id, hasImporter, options }: RenderRequestMessage) => {
  try {
    if (hasImporter) {
      // When a custom importer function is present, the importer request must be proxied
      // back to the main thread where it can be executed.
      // This process must be synchronous from the perspective of dart-sass. The `Atomics`
      // functions combined with the shared memory `importSignal` and the Node.js
      // `receiveMessageOnPort` function are used to ensure synchronous behavior.
      options.importer = function (url, prev) {
        Atomics.store(importerSignal, 0, 0);
        const { fromImport } = this;
        workerImporterPort.postMessage({ id, url, prev, fromImport });
        Atomics.wait(importerSignal, 0, 0);

        return receiveMessageOnPort(workerImporterPort)?.message as ImporterReturnType;
      };
    }

    // The synchronous Sass render function can be up to two times faster than the async variant
    const result = renderSync(options);

    parentPort?.postMessage({ id, result });
  } catch (error) {
    // Needed because V8 will only serialize the message and stack properties of an Error instance.
    const { formatted, file, line, column, message, stack } = error;
    parentPort?.postMessage({ id, error: { formatted, file, line, column, message, stack } });
  }
});
