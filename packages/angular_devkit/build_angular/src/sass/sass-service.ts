/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MessageChannel, Worker } from 'node:worker_threads';
import {
  CompileResult,
  Exception,
  FileImporter,
  Importer,
  Logger,
  SourceSpan,
  StringOptionsWithImporter,
  StringOptionsWithoutImporter,
} from 'sass';
import { maxWorkers } from '../utils/environment-options';

/**
 * The maximum number of Workers that will be created to execute render requests.
 */
const MAX_RENDER_WORKERS = maxWorkers;

/**
 * The callback type for the `dart-sass` asynchronous render function.
 */
type RenderCallback = (error?: Exception, result?: CompileResult) => void;

type FileImporterOptions = Parameters<FileImporter['findFileUrl']>[1];

export interface FileImporterWithRequestContextOptions extends FileImporterOptions {
  /**
   * This is a custom option and is required as SASS does not provide context from which the file is being resolved.
   * This breaks Yarn PNP as transitive deps cannot be resolved from the workspace root.
   *
   * Workaround until https://github.com/sass/sass/issues/3247 is addressed.
   */
  previousResolvedModules?: Set<string>;
}

/**
 * An object containing the contextual information for a specific render request.
 */
interface RenderRequest {
  id: number;
  workerIndex: number;
  callback: RenderCallback;
  logger?: Logger;
  importers?: Importers[];
  previousResolvedModules?: Set<string>;
}

/**
 * All available importer types.
 */
type Importers =
  | Importer<'sync'>
  | Importer<'async'>
  | FileImporter<'sync'>
  | FileImporter<'async'>;

/**
 * A response from the Sass render Worker containing the result of the operation.
 */
interface RenderResponseMessage {
  id: number;
  error?: Exception;
  result?: Omit<CompileResult, 'loadedUrls'> & { loadedUrls: string[] };
  warnings?: {
    message: string;
    deprecation: boolean;
    stack?: string;
    span?: Omit<SourceSpan, 'url'> & { url?: string };
  }[];
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
  private readonly workerPath = join(__dirname, './worker.js');
  private idCounter = 1;
  private nextWorkerIndex = 0;

  constructor(private rebase = false) {}

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
  compileString(): never {
    throw new Error('Sass compileString is not supported.');
  }

  /**
   * Asynchronously request a Sass stylesheet to be renderered.
   *
   * @param source The contents to compile.
   * @param options The `dart-sass` options to use when rendering the stylesheet.
   */
  compileStringAsync(
    source: string,
    options: StringOptionsWithImporter<'async'> | StringOptionsWithoutImporter<'async'>,
  ): Promise<CompileResult> {
    // The `functions`, `logger` and `importer` options are JavaScript functions that cannot be transferred.
    // If any additional function options are added in the future, they must be excluded as well.
    const { functions, importers, url, logger, ...serializableOptions } = options;

    // The CLI's configuration does not use or expose the ability to defined custom Sass functions
    if (functions && Object.keys(functions).length > 0) {
      throw new Error('Sass custom functions are not supported.');
    }

    return new Promise<CompileResult>((resolve, reject) => {
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

      const callback: RenderCallback = (error, result) => {
        if (error) {
          const url = error.span?.url as string | undefined;
          if (url) {
            error.span.url = pathToFileURL(url);
          }

          reject(error);

          return;
        }

        if (!result) {
          reject(new Error('No result.'));

          return;
        }

        resolve(result);
      };

      const request = this.createRequest(workerIndex, callback, logger, importers);
      this.requests.set(request.id, request);

      this.workers[workerIndex].postMessage({
        id: request.id,
        source,
        hasImporter: !!importers?.length,
        hasLogger: !!logger,
        rebase: this.rebase,
        options: {
          ...serializableOptions,
          // URL is not serializable so to convert to string here and back to URL in the worker.
          url: url ? fileURLToPath(url) : undefined,
        },
      });
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

    const worker = new Worker(this.workerPath, {
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

      if (response.warnings && request.logger?.warn) {
        for (const { message, span, ...options } of response.warnings) {
          request.logger.warn(message, {
            ...options,
            span: span && {
              ...span,
              url: span.url ? pathToFileURL(span.url) : undefined,
            },
          });
        }
      }

      if (response.result) {
        request.callback(undefined, {
          ...response.result,
          // URL is not serializable so in the worker we convert to string and here back to URL.
          loadedUrls: response.result.loadedUrls.map((p) => pathToFileURL(p)),
        });
      } else {
        request.callback(response.error);
      }
    });

    mainImporterPort.on(
      'message',
      ({ id, url, options }: { id: number; url: string; options: FileImporterOptions }) => {
        const request = this.requests.get(id);
        if (!request?.importers) {
          mainImporterPort.postMessage(null);
          Atomics.store(importerSignal, 0, 1);
          Atomics.notify(importerSignal, 0);

          return;
        }

        this.processImporters(request.importers, url, {
          ...options,
          previousResolvedModules: request.previousResolvedModules,
        })
          .then((result) => {
            if (result) {
              request.previousResolvedModules ??= new Set();
              request.previousResolvedModules.add(dirname(result));
            }

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
    importers: Iterable<Importers>,
    url: string,
    options: FileImporterWithRequestContextOptions,
  ): Promise<string | null> {
    for (const importer of importers) {
      if (this.isImporter(importer)) {
        // Importer
        throw new Error('Only File Importers are supported.');
      }

      // File importer (Can be sync or aync).
      const result = await importer.findFileUrl(url, options);
      if (result) {
        return fileURLToPath(result);
      }
    }

    return null;
  }

  private createRequest(
    workerIndex: number,
    callback: RenderCallback,
    logger: Logger | undefined,
    importers: Importers[] | undefined,
  ): RenderRequest {
    return {
      id: this.idCounter++,
      workerIndex,
      callback,
      logger,
      importers,
    };
  }

  private isImporter(value: Importers): value is Importer {
    return 'canonicalize' in value && 'load' in value;
  }
}
