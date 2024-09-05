/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MessageChannel } from 'node:worker_threads';
import type {
  CanonicalizeContext,
  CompileResult,
  Deprecation,
  Exception,
  FileImporter,
  Importer,
  NodePackageImporter,
  SourceSpan,
  StringOptions,
} from 'sass';
import { maxWorkers } from '../../utils/environment-options';
import { WorkerPool } from '../../utils/worker-pool';

// Polyfill Symbol.dispose if not present
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Symbol as any).dispose ??= Symbol('Symbol Dispose');

/**
 * The maximum number of Workers that will be created to execute render requests.
 */
const MAX_RENDER_WORKERS = maxWorkers;

/**
 * All available importer types.
 */
type Importers =
  | Importer<'sync'>
  | Importer<'async'>
  | FileImporter<'sync'>
  | FileImporter<'async'>
  | NodePackageImporter;

export interface SerializableVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface SerializableDeprecation extends Omit<Deprecation, 'obsoleteIn' | 'deprecatedIn'> {
  /** The version this deprecation first became active in. */
  deprecatedIn: SerializableVersion | null;

  /** The version this deprecation became obsolete in. */
  obsoleteIn: SerializableVersion | null;
}

export type SerializableWarningMessage = (
  | {
      deprecation: true;
      deprecationType: SerializableDeprecation;
    }
  | { deprecation: false }
) & {
  message: string;
  span?: Omit<SourceSpan, 'url'> & { url?: string };
  stack?: string;
};

/**
 * A response from the Sass render Worker containing the result of the operation.
 */
interface RenderResponseMessage {
  error?: Exception;
  result?: Omit<CompileResult, 'loadedUrls'> & { loadedUrls: string[] };
  warnings?: SerializableWarningMessage[];
}

/**
 * A Sass renderer implementation that provides an interface that can be used by Webpack's
 * `sass-loader`. The implementation uses a Worker thread to perform the Sass rendering
 * with the `dart-sass` package.  The `dart-sass` synchronous render function is used within
 * the worker which can be up to two times faster than the asynchronous variant.
 */
export class SassWorkerImplementation {
  #workerPool: WorkerPool | undefined;

  constructor(
    private readonly rebase = false,
    readonly maxThreads = MAX_RENDER_WORKERS,
  ) {}

  #ensureWorkerPool(): WorkerPool {
    this.#workerPool ??= new WorkerPool({
      filename: require.resolve('./worker'),
      maxThreads: this.maxThreads,
    });

    return this.#workerPool;
  }

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
  async compileStringAsync(
    source: string,
    options: StringOptions<'async'>,
  ): Promise<CompileResult> {
    // The `functions`, `logger` and `importer` options are JavaScript functions that cannot be transferred.
    // If any additional function options are added in the future, they must be excluded as well.
    const { functions, importers, url, logger, ...serializableOptions } = options;

    // The CLI's configuration does not use or expose the ability to define custom Sass functions
    if (functions && Object.keys(functions).length > 0) {
      throw new Error('Sass custom functions are not supported.');
    }

    using importerChannel = importers?.length ? this.#createImporterChannel(importers) : undefined;

    const response = (await this.#ensureWorkerPool().run(
      {
        source,
        importerChannel,
        hasLogger: !!logger,
        rebase: this.rebase,
        options: {
          ...serializableOptions,
          // URL is not serializable so to convert to string here and back to URL in the worker.
          url: url ? fileURLToPath(url) : undefined,
        },
      },
      {
        transferList: importerChannel ? [importerChannel.port] : undefined,
      },
    )) as RenderResponseMessage;

    const { result, error, warnings } = response;

    if (warnings && logger?.warn) {
      for (const { message, span, ...options } of warnings) {
        logger.warn(message, {
          ...options,
          span: span && {
            ...span,
            url: span.url ? pathToFileURL(span.url) : undefined,
          },
        });
      }
    }

    if (error) {
      // Convert stringified url value required for cloning back to a URL object
      const url = error.span?.url as string | undefined;
      if (url) {
        error.span.url = pathToFileURL(url);
      }

      throw error;
    }

    assert(result, 'Sass render worker should always return a result or an error');

    return {
      ...result,
      // URL is not serializable so in the worker we convert to string and here back to URL.
      loadedUrls: result.loadedUrls.map((p) => pathToFileURL(p)),
    };
  }

  /**
   * Shutdown the Sass render worker.
   * Executing this method will stop any pending render requests.
   * @returns A void promise that resolves when closing is complete.
   */
  async close(): Promise<void> {
    if (this.#workerPool) {
      try {
        await this.#workerPool.destroy();
      } finally {
        this.#workerPool = undefined;
      }
    }
  }

  #createImporterChannel(importers: Iterable<Importers>) {
    const { port1: mainImporterPort, port2: workerImporterPort } = new MessageChannel();
    const importerSignal = new Int32Array(new SharedArrayBuffer(4));

    mainImporterPort.on(
      'message',
      ({ url, options }: { url: string; options: CanonicalizeContext }) => {
        this.processImporters(importers, url, {
          ...options,
          // URL is not serializable so in the worker we convert to string and here back to URL.
          containingUrl: options.containingUrl
            ? pathToFileURL(options.containingUrl as unknown as string)
            : null,
        })
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

    return {
      port: workerImporterPort,
      signal: importerSignal,
      [Symbol.dispose]() {
        mainImporterPort.close();
      },
    };
  }

  private async processImporters(
    importers: Iterable<Importers>,
    url: string,
    options: CanonicalizeContext,
  ): Promise<string | null> {
    for (const importer of importers) {
      if (!this.isFileImporter(importer)) {
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

  private isFileImporter(value: Importers): value is FileImporter {
    return 'findFileUrl' in value;
  }
}
