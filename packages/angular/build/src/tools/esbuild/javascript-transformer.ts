/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFile } from 'node:fs/promises';
import { createContentHash } from '../../utils/hash';
import { IMPORT_EXEC_ARGV } from '../../utils/server-rendering/esm-in-memory-loader/utils';
import { removeSourceMappingURL } from '../../utils/source-map';
import { WorkerPool, WorkerPoolOptions } from '../../utils/worker-pool';
import { Cache } from './cache';

const SOURCEMAP_COMMENT_BYTES = Buffer.from('sourceMappingURL=');
const LINKER_DECLARATION_PREFIX = 'ɵɵngDeclare';
const LINKER_DECLARATION_PREFIX_BYTES = Buffer.from(LINKER_DECLARATION_PREFIX, 'utf-8');

/**
 * Determines whether JavaScript code requires Angular linker processing.
 *
 * @param path The full path to the file.
 * @param data The data (string or Buffer) of the file.
 * @returns True if the code contains an Angular partial declaration; otherwise false.
 */
function requiresLinking(path: string, data: string | Uint8Array): boolean {
  // @angular/core and @angular/compiler will cause false positives
  // Also, TypeScript files do not require linking
  if (/[\\/]@angular[\\/](?:compiler|core)[\\/]|\.[cm]?tsx?$/.test(path)) {
    return false;
  }

  if (typeof data === 'string') {
    return data.includes(LINKER_DECLARATION_PREFIX);
  }

  const dataBuffer = Buffer.isBuffer(data)
    ? data
    : Buffer.from(data.buffer, data.byteOffset, data.byteLength);

  return dataBuffer.includes(LINKER_DECLARATION_PREFIX_BYTES);
}

/**
 * Transformation options that should apply to all transformed files and data.
 */
export interface JavaScriptTransformerOptions {
  sourcemap: boolean;
  thirdPartySourcemaps?: boolean;
  advancedOptimizations?: boolean;
  jit?: boolean;
}

/**
 * A class that performs transformation of JavaScript files and raw data.
 * A worker pool is used to distribute the transformation actions and allow
 * parallel processing. Transformation behavior is based on the filename and
 * data. Transformations may include: async downleveling, Angular linking,
 * and advanced optimizations.
 */
export class JavaScriptTransformer {
  #workerPool: WorkerPool | undefined;
  #commonOptions: Required<JavaScriptTransformerOptions>;
  #fileCacheKeyBase: Uint8Array;

  /** Queue of pending transformation tasks waiting for an active concurrency slot. */
  #pendingTasks: { resolve: () => void; reject: (reason: Error) => void }[] = [];

  /** Current count of actively executing transformation tasks. */
  #activeTasks = 0;

  /** Maximum number of transformation tasks allowed to execute concurrently. */
  #maxConcurrent: number;

  constructor(
    options: JavaScriptTransformerOptions,
    readonly maxThreads: number,
    private readonly cache?: Cache<Uint8Array>,
  ) {
    // Maintain 2 active tasks per worker thread to keep transformation pipelines fully saturated
    this.#maxConcurrent = Math.max(1, maxThreads * 2);
    // Extract options to ensure only the named options are serialized and sent to the worker
    const {
      sourcemap,
      thirdPartySourcemaps = false,
      advancedOptimizations = false,
      jit = false,
    } = options;
    this.#commonOptions = {
      sourcemap,
      thirdPartySourcemaps,
      advancedOptimizations,
      jit,
    };
    this.#fileCacheKeyBase = Buffer.from(JSON.stringify(this.#commonOptions), 'utf-8');
  }

  /**
   * Executes a transformation action using a semaphore-based backpressure throttle.
   * Prevents libuv thread pool saturation and excessive V8 heap accumulation.
   * @param action A callback that produces a promise for the transformation result.
   * @returns A promise resolving to the transformation result.
   */
  async #runWithThrottle<T>(action: () => Promise<T>): Promise<T> {
    if (this.#activeTasks >= this.#maxConcurrent) {
      await new Promise<void>((resolve, reject) => {
        this.#pendingTasks.push({ resolve, reject });
      });
    } else {
      this.#activeTasks++;
    }

    try {
      return await action();
    } finally {
      const next = this.#pendingTasks.shift();
      if (next) {
        next.resolve();
      } else {
        this.#activeTasks--;
      }
    }
  }

  #ensureWorkerPool(): WorkerPool {
    if (this.#workerPool) {
      return this.#workerPool;
    }

    const workerPoolOptions: WorkerPoolOptions = {
      filename: require.resolve('./javascript-transformer-worker'),
      maxThreads: this.maxThreads,
    };

    // Prevent passing SSR `--import` (loader-hooks) from parent to child worker.
    const filteredExecArgv = process.execArgv.filter((v) => v !== IMPORT_EXEC_ARGV);
    if (process.execArgv.length !== filteredExecArgv.length) {
      workerPoolOptions.execArgv = filteredExecArgv;
    }

    this.#workerPool = new WorkerPool(workerPoolOptions);

    return this.#workerPool;
  }

  /**
   * Performs JavaScript transformations on a file from the filesystem.
   * If no transformations are required, the data for the original file will be returned.
   * @param filename The full path to the file.
   * @param skipLinker If true, bypass all Angular linker processing; if false, attempt linking.
   * @param sideEffects If false, and `advancedOptimizations` is enabled tslib decorators are wrapped.
   * @returns A promise that resolves to a UTF-8 encoded Uint8Array containing the result.
   */
  async transformFile(
    filename: string,
    skipLinker?: boolean,
    sideEffects?: boolean,
    instrumentForCoverage?: boolean,
  ): Promise<Uint8Array> {
    return this.#runWithThrottle(async () => {
      const data = await readFile(filename);

      let cacheKey: string | undefined;
      if (this.cache) {
        // Create a cache key from the file data and options that effect the output.
        // NOTE: If additional options are added, this may need to be updated.
        const hasher = createContentHash();
        hasher.update(`${!!skipLinker}--${!!sideEffects}`);
        hasher.update(data);
        hasher.update(this.#fileCacheKeyBase);
        cacheKey = hasher.digest();

        try {
          const cached = await this.cache.get(cacheKey);
          if (cached !== undefined) {
            return cached;
          }
        } catch {
          // Failure to get the value should not fail the transform
        }
      }

      const result = await this.transformData(
        filename,
        data,
        !!skipLinker,
        sideEffects,
        instrumentForCoverage,
      );

      if (this.cache && cacheKey) {
        try {
          await this.cache.put(cacheKey, result);
        } catch {
          // Failure to store the value in the cache should not fail the transform
        }
      }

      return result;
    });
  }

  /**
   * Performs JavaScript transformations on the provided data of a file. The file does not need
   * to exist on the filesystem.
   * @param filename The full path of the file represented by the data.
   * @param data The data of the file that should be transformed.
   * @param skipLinker If true, bypass all Angular linker processing; if false, attempt linking.
   * @param sideEffects If false, and `advancedOptimizations` is enabled tslib decorators are wrapped.
   * @returns A promise that resolves to a UTF-8 encoded Uint8Array containing the result.
   */
  async transformData(
    filename: string,
    data: string | Uint8Array,
    skipLinker: boolean,
    sideEffects?: boolean,
    instrumentForCoverage?: boolean,
  ): Promise<Uint8Array> {
    const shouldLink = !skipLinker && requiresLinking(filename, data);

    // Perform a quick test to determine if the data needs any transformations.
    // This allows directly returning the data without the worker communication overhead.
    if (!shouldLink && !this.#commonOptions.advancedOptimizations && !instrumentForCoverage) {
      const keepSourcemap =
        this.#commonOptions.sourcemap &&
        (!!this.#commonOptions.thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));

      if (typeof data === 'string') {
        return Buffer.from(keepSourcemap ? data : removeSourceMappingURL(data), 'utf-8');
      }

      if (keepSourcemap) {
        return data;
      }

      const dataBuffer = Buffer.isBuffer(data)
        ? data
        : Buffer.from(data.buffer, data.byteOffset, data.byteLength);

      // Fast check on raw ASCII bytes to avoid UTF-8 string decoding if no comment exists.
      if (dataBuffer.indexOf(SOURCEMAP_COMMENT_BYTES) === -1) {
        return data;
      }

      const text = dataBuffer.toString('utf-8');
      const stripped = removeSourceMappingURL(text);

      return stripped === text ? data : Buffer.from(stripped, 'utf-8');
    }

    // Only standalone (non-pooled) ArrayBuffers can be transferred across worker threads.
    // Node.js shares an internal 8KB ArrayBuffer pool for small buffers, and transferring
    // a pooled buffer will throw a DataCloneError because detaching it invalidates other slices.
    // In addition, SharedArrayBuffers cannot be transferred, and Yarn PnP has deserialization issues.
    const isTransferable =
      typeof data !== 'string' &&
      data.buffer instanceof ArrayBuffer &&
      data.byteOffset === 0 &&
      data.byteLength === data.buffer.byteLength &&
      !process.versions.pnp;

    return this.#ensureWorkerPool().run(
      {
        filename,
        data,
        skipLinker: !shouldLink,
        sideEffects,
        instrumentForCoverage,
        ...this.#commonOptions,
      },
      {
        transferList: isTransferable ? [data.buffer] : undefined,
      },
    );
  }

  /**
   * Stops all active transformation tasks and shuts down all workers.
   * @returns A void promise that resolves when closing is complete.
   */
  async close(): Promise<void> {
    const pending = this.#pendingTasks;
    this.#pendingTasks = [];
    for (const task of pending) {
      task.reject(new Error('JavaScriptTransformer closed.'));
    }

    if (this.#workerPool) {
      try {
        await this.#workerPool.destroy();
      } finally {
        this.#workerPool = undefined;
      }
    }
  }
}
