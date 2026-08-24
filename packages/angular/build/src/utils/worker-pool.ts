/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { getCompileCacheDir } from 'node:module';
import { FixedQueue, Piscina } from 'piscina';
import { maxWorkers } from './environment-options';
import { IMPORT_EXEC_ARGV } from './server-rendering/esm-in-memory-loader/utils';

export type WorkerPoolOptions = ConstructorParameters<typeof Piscina>[0];

export class WorkerPool extends Piscina {
  constructor(options?: WorkerPoolOptions) {
    const piscinaOptions: WorkerPoolOptions = {
      minThreads: options?.maxThreads ?? maxWorkers,
      idleTimeout: 30_000,
      concurrentTasksPerWorker: 2,
      taskQueue: new FixedQueue(),
      // Web containers do not support transferable objects with receiveOnMessagePort which
      // is used when the Atomics based wait loop is enable.
      atomics: process.versions.webcontainer ? 'disabled' : 'sync',
      recordTiming: false,
      ...options,
    };

    // Enable compile code caching if enabled for the main process (only exists on Node.js v22.8+).
    // Skip if running inside Bazel via a RUNFILES environment variable check. The cache does not work
    // well with Bazel's hermeticity requirements.
    const compileCacheDirectory = process.env['JS_BINARY__RUNFILES']
      ? undefined
      : getCompileCacheDir?.();
    if (compileCacheDirectory) {
      if (typeof piscinaOptions.env === 'object' && piscinaOptions.env !== null) {
        piscinaOptions.env = {
          ...piscinaOptions.env,
          'NODE_COMPILE_CACHE': compileCacheDirectory,
        };
      } else if (piscinaOptions.env === undefined) {
        // Default behavior of `env` option is to copy current process values
        piscinaOptions.env = {
          ...process.env,
          'NODE_COMPILE_CACHE': compileCacheDirectory,
        };
      }
    }

    super(piscinaOptions);
  }
}

/**
 * The singleton shared build worker pool instance.
 */
let sharedBuildWorkerPool: WorkerPool | undefined;
let shutdownPromise: Promise<void> | undefined;

/**
 * Returns the singleton shared build worker pool instance bounded by `maxWorkers`.
 * The pool routes tasks using `shared-worker-router`.
 */
export function getSharedBuildWorkerPool(): WorkerPool {
  if (!sharedBuildWorkerPool) {
    const filteredExecArgv = process.execArgv.filter((v) => v !== IMPORT_EXEC_ARGV);
    sharedBuildWorkerPool = new WorkerPool({
      filename: require.resolve('./shared-worker-router'),
      maxThreads: maxWorkers,
      minThreads: maxWorkers,
      execArgv: filteredExecArgv.length !== process.execArgv.length ? filteredExecArgv : undefined,
    });
  }

  return sharedBuildWorkerPool;
}

/**
 * Destroys and resets the singleton shared build worker pool.
 */
export async function shutdownSharedBuildWorkerPool(): Promise<void> {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  if (sharedBuildWorkerPool) {
    const pool = sharedBuildWorkerPool;
    sharedBuildWorkerPool = undefined;
    shutdownPromise = pool.destroy().finally(() => {
      shutdownPromise = undefined;
    });
    await shutdownPromise;
  }
}
