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

const LINKER_DECLARATION_PREFIX = 'ɵɵngDeclare';
const LINKER_DECLARATION_PREFIX_BYTES = Buffer.from(LINKER_DECLARATION_PREFIX, 'utf-8');

const ADVANCED_OPTIMIZATION_TOKENS = [
  'ɵ',
  'InjectionToken',
  'INJECTOR_KEY',
  'ctorParameters',
  'decorators',
  'propDecorators',
] as const;

const ADVANCED_OPTIMIZATION_TOKEN_BYTES = ADVANCED_OPTIMIZATION_TOKENS.map((token) =>
  Buffer.from(token, 'utf-8'),
);

const DECORATOR_TOKENS = ['__decorate', '__esDecorate'] as const;
const DECORATOR_TOKEN_BYTES = DECORATOR_TOKENS.map((token) => Buffer.from(token, 'utf-8'));

const ADVANCED_OPTIMIZATION_REGEX = new RegExp(ADVANCED_OPTIMIZATION_TOKENS.join('|'));
const DECORATOR_REGEX = new RegExp(DECORATOR_TOKENS.join('|'));

/**
 * Determines whether JavaScript code contains potential candidate constructs for advanced optimizations.
 * When false, advanced optimizations can be bypassed without worker dispatch or AST parsing.
 *
 * @param filename The full path to the file.
 * @param data The data (string or Buffer) of the file.
 * @param sideEffects An optional lazy resolver callback that returns whether the file is considered side-effect free.
 * @returns True if the code may contain constructs that advanced optimizations can mutate.
 */
async function hasAdvancedOptimizationCandidates(
  filename: string,
  data: string | Uint8Array,
  sideEffects?: () => Promise<boolean | undefined>,
): Promise<boolean> {
  // Side-effect-free @angular/ packages undergo top-level pure function annotations
  if (/[\\/]node_modules[\\/]@angular[\\/]/.test(filename) && (await sideEffects?.()) === false) {
    return true;
  }

  if (typeof data === 'string') {
    const hasDecorators = DECORATOR_REGEX.test(data);
    if (hasDecorators && (await sideEffects?.()) === false) {
      return true;
    }

    return ADVANCED_OPTIMIZATION_REGEX.test(data);
  }

  const dataBuffer = Buffer.isBuffer(data)
    ? data
    : Buffer.from(data.buffer, data.byteOffset, data.byteLength);

  for (const tokenBytes of DECORATOR_TOKEN_BYTES) {
    if (dataBuffer.includes(tokenBytes)) {
      if ((await sideEffects?.()) === false) {
        return true;
      }
      break;
    }
  }

  for (const tokenBytes of ADVANCED_OPTIMIZATION_TOKEN_BYTES) {
    if (dataBuffer.includes(tokenBytes)) {
      return true;
    }
  }

  return false;
}

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

  /**
   * The maximum number of concurrent transformation operations.
   * When omitted, concurrency defaults to the available worker pool threads.
   */
  maxConcurrency?: number;
}

/**
 * Transformation options for an individual file or data transform request.
 */
export interface TransformOptions {
  /** If true, bypass all Angular linker processing; if false, attempt linking. */
  skipLinker?: boolean;

  /**
   * An optional lazy resolver callback that returns whether the file has side-effects.
   * If it resolves to false, top-level pure function annotations and decorator wrapping may be applied.
   */
  sideEffects?: () => Promise<boolean | undefined>;

  /** If true, instrument the code for test coverage. */
  instrumentForCoverage?: boolean;
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
  #commonOptions: Required<Omit<JavaScriptTransformerOptions, 'maxConcurrency'>>;
  #fileCacheKeyBase: Uint8Array;

  /** Queue of pending transformation tasks waiting for an active concurrency slot. */
  #pendingTasks: { resolve: () => void; reject: (reason: Error) => void }[] = [];

  /** Current count of actively executing transformation tasks. */
  #activeTasks = 0;

  get #maxConcurrency(): number {
    return this.options.maxConcurrency ?? (this.#workerPool?.maxThreads || 1);
  }

  constructor(
    private readonly options: JavaScriptTransformerOptions,
    private readonly cache?: Cache<Uint8Array>,
  ) {
    if (
      options.maxConcurrency !== undefined &&
      (!Number.isInteger(options.maxConcurrency) || options.maxConcurrency < 1)
    ) {
      throw new RangeError('options.maxConcurrency must be an integer greater than or equal to 1.');
    }

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
    this.#workerPool = this.#ensureWorkerPool();
  }

  /**
   * Executes a transformation action using a semaphore-based backpressure throttle.
   * Prevents libuv thread pool saturation and excessive V8 heap accumulation.
   * @param action A callback that produces a promise for the transformation result.
   * @returns A promise resolving to the transformation result.
   */
  async #runWithThrottle<T>(action: () => Promise<T>): Promise<T> {
    if (this.#activeTasks >= this.#maxConcurrency) {
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
      workerData: this.#commonOptions,
      ...(this.options.maxConcurrency !== undefined && {
        maxThreads: this.options.maxConcurrency,
      }),
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
   * @param options Transformation options specific to this file.
   * @returns A promise that resolves to a UTF-8 encoded Uint8Array containing the result.
   */
  async transformFile(filename: string, options?: TransformOptions): Promise<Uint8Array> {
    return this.#runWithThrottle(async () => {
      const data = await readFile(filename);

      return this.#transform(filename, data, options);
    });
  }

  /**
   * Performs JavaScript transformations on the provided data of a file. The file does not need
   * to exist on the filesystem.
   * @param filename The full path of the file represented by the data.
   * @param data The data of the file that should be transformed.
   * @param options Transformation options specific to this file data.
   * @returns A promise that resolves to a UTF-8 encoded Uint8Array containing the result.
   */
  async transformData(
    filename: string,
    data: string | Uint8Array,
    options?: TransformOptions,
  ): Promise<Uint8Array> {
    return this.#runWithThrottle(() => this.#transform(filename, data, options));
  }

  async #transform(
    filename: string,
    data: string | Uint8Array,
    options?: TransformOptions,
  ): Promise<Uint8Array> {
    let resolvedSideEffects: boolean | undefined;
    let sideEffectsQueried = false;

    const sideEffectsGetter = options?.sideEffects
      ? async () => {
          if (!sideEffectsQueried) {
            sideEffectsQueried = true;
            resolvedSideEffects = await options.sideEffects?.();
          }

          return resolvedSideEffects;
        }
      : undefined;

    const shouldLink = !options?.skipLinker && requiresLinking(filename, data);
    const shouldOptimize =
      this.#commonOptions.advancedOptimizations &&
      (await hasAdvancedOptimizationCandidates(filename, data, sideEffectsGetter));

    // Perform a quick test to determine if the data needs any transformations.
    // This allows directly returning the data without the worker communication overhead.
    if (!shouldLink && !shouldOptimize && !options?.instrumentForCoverage) {
      const keepSourcemap =
        this.#commonOptions.sourcemap &&
        (!!this.#commonOptions.thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));

      if (typeof data === 'string') {
        return Buffer.from(keepSourcemap ? data : removeSourceMappingURL(data), 'utf-8');
      }

      return keepSourcemap ? data : removeSourceMappingURL(data);
    }

    let cacheKey: string | undefined;
    if (this.cache) {
      // Create a cache key from the file data and options that affect the output.
      // NOTE: If additional options are added, this may need to be updated.
      const hasher = createContentHash();
      hasher.update(
        `${!options?.skipLinker}--${resolvedSideEffects === false}--${!!options?.instrumentForCoverage}`,
      );
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

    const result = (await this.#ensureWorkerPool().run(
      {
        filename,
        data,
        skipLinker: !shouldLink,
        sideEffects: resolvedSideEffects,
        instrumentForCoverage: options?.instrumentForCoverage,
      },
      {
        transferList: isTransferable ? [data.buffer] : undefined,
      },
    )) as Uint8Array;

    if (this.cache && cacheKey) {
      try {
        await this.cache.put(cacheKey, result);
      } catch {
        // Failure to store the value in the cache should not fail the transform
      }
    }

    return result;
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
