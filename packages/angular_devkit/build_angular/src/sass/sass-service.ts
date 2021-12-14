/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  LegacyAsyncImporter as AsyncImporter,
  LegacyResult as CompileResult,
  LegacyException as Exception,
  LegacyImporterResult as ImporterResult,
  LegacyImporterThis as ImporterThis,
  LegacyOptions as Options,
  LegacySyncImporter as SyncImporter,
} from 'sass';
import { MessageChannel, Worker } from 'worker_threads';
import { maxWorkers } from '../utils/environment-options';

/**
 * The maximum number of Workers that will be created to execute render requests.
 */
const MAX_RENDER_WORKERS = maxWorkers;

/**
 * The callback type for the `dart-sass` asynchronous render function.
 */
type RenderCallback = (error?: Exception, result?: CompileResult) => void;

/**
 * An object containing the contextual information for a specific render request.
 */
interface RenderRequest {
  id: number;
  workerIndex: number;
  callback: RenderCallback;
  importers?: (SyncImporter | AsyncImporter)[];
}

/**
 * A response from the Sass render Worker containing the result of the operation.
 */
interface RenderResponseMessage {
  id: number;
  error?: Exception;
  result?: CompileResult;
}

/**
 * A Sass renderer implementation that provides an interface that can be used by Webpack's
 * `sass-loader`. The implementation uses a Worker thread to perform the Sass rendering
 * with the `dart-sass` package.  The `dart-sass` synchronous render function is used within
 * the worker which can be up to two times faster than the asynchronous variant.
 */
export class SassWorkerImplementation {
  private readonly workers: Worker[] = [];
  private readonly availableWorkers: number[] = [];
  private readonly requests = new Map<number, RenderRequest>();
  private idCounter = 1;
  private nextWorkerIndex = 0;

  /**
   * Provides information about the Sass implementation.
   * This mimics enough of the `dart-sass` value to be used with the `sass-loader`.
   */
  get info(): string {
    return 'dart-sass\tworker';
  }

  /**
   * The synchronous render function is not used by the `sass-loader`.
   */
  renderSync(): never {
    throw new Error('Sass renderSync is not supported.');
  }

  /**
   * Asynchronously request a Sass stylesheet to be renderered.
   *
   * @param options The `dart-sass` options to use when rendering the stylesheet.
   * @param callback The function to execute when the rendering is complete.
   */
  render(options: Options<'async'>, callback: RenderCallback): void {
    // The `functions`, `logger` and `importer` options are JavaScript functions that cannot be transferred.
    // If any additional function options are added in the future, they must be excluded as well.
    const { functions, importer, logger, ...serializableOptions } = options;

    // The CLI's configuration does not use or expose the ability to defined custom Sass functions
    if (functions && Object.keys(functions).length > 0) {
      throw new Error('Sass custom functions are not supported.');
    }

    let workerIndex = this.availableWorkers.pop();
    if (workerIndex === undefined) {
      if (this.workers.length < MAX_RENDER_WORKERS) {
        workerIndex = this.workers.length;
        this.workers.push(this.createWorker());
      } else {
        workerIndex = this.nextWorkerIndex++;
        if (this.nextWorkerIndex >= this.workers.length) {
          this.nextWorkerIndex = 0;
        }
      }
    }

    const request = this.createRequest(workerIndex, callback, importer);
    this.requests.set(request.id, request);

    this.workers[workerIndex].postMessage({
      id: request.id,
      hasImporter: !!importer,
      options: serializableOptions,
    });
  }

  /**
   * Shutdown the Sass render worker.
   * Executing this method will stop any pending render requests.
   */
  close(): void {
    for (const worker of this.workers) {
      try {
        void worker.terminate();
      } catch {}
    }
    this.requests.clear();
  }

  private createWorker(): Worker {
    const { port1: mainImporterPort, port2: workerImporterPort } = new MessageChannel();
    const importerSignal = new Int32Array(new SharedArrayBuffer(4));

    const workerPath = require.resolve('./worker');
    const worker = new Worker(workerPath, {
      workerData: { workerImporterPort, importerSignal },
      transferList: [workerImporterPort],
    });

    worker.on('message', (response: RenderResponseMessage) => {
      const request = this.requests.get(response.id);
      if (!request) {
        return;
      }

      this.requests.delete(response.id);
      this.availableWorkers.push(request.workerIndex);

      if (response.result) {
        // The results are expected to be Node.js `Buffer` objects but will each be transferred as
        // a Uint8Array that does not have the expected `toString` behavior of a `Buffer`.
        const { css, map, stats } = response.result;
        const result: CompileResult = {
          // This `Buffer.from` override will use the memory directly and avoid making a copy
          css: Buffer.from(css.buffer, css.byteOffset, css.byteLength),
          stats,
        };
        if (map) {
          // This `Buffer.from` override will use the memory directly and avoid making a copy
          result.map = Buffer.from(map.buffer, map.byteOffset, map.byteLength);
        }
        request.callback(undefined, result);
      } else {
        request.callback(response.error);
      }
    });

    mainImporterPort.on(
      'message',
      ({
        id,
        url,
        prev,
        fromImport,
      }: {
        id: number;
        url: string;
        prev: string;
        fromImport: boolean;
      }) => {
        const request = this.requests.get(id);
        if (!request?.importers) {
          mainImporterPort.postMessage(null);
          Atomics.store(importerSignal, 0, 1);
          Atomics.notify(importerSignal, 0);

          return;
        }

        this.processImporters(request.importers, url, prev, fromImport)
          .then((result) => {
            mainImporterPort.postMessage(result);
          })
          .catch((error) => {
            mainImporterPort.postMessage(error);
          })
          .finally(() => {
            Atomics.store(importerSignal, 0, 1);
            Atomics.notify(importerSignal, 0);
          });
      },
    );

    mainImporterPort.unref();

    return worker;
  }

  private async processImporters(
    importers: Iterable<SyncImporter | AsyncImporter>,
    url: string,
    prev: string,
    fromImport: boolean,
  ): Promise<ImporterResult> {
    let result = null;
    for (const importer of importers) {
      result = await new Promise<ImporterResult>((resolve) => {
        // Importers can be both sync and async
        const innerResult = (importer as AsyncImporter).call(
          { fromImport } as ImporterThis,
          url,
          prev,
          resolve,
        );
        if (innerResult !== undefined) {
          resolve(innerResult);
        }
      });

      if (result) {
        break;
      }
    }

    return result;
  }

  private createRequest(
    workerIndex: number,
    callback: RenderCallback,
    importer: SyncImporter | AsyncImporter | (SyncImporter | AsyncImporter)[] | undefined,
  ): RenderRequest {
    return {
      id: this.idCounter++,
      workerIndex,
      callback,
      importers: !importer || Array.isArray(importer) ? importer : [importer],
    };
  }
}
