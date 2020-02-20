/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import JestWorker from 'jest-worker';
import * as os from 'os';
import * as path from 'path';
import * as v8 from 'v8';
import { BundleActionCache } from './action-cache';
import { I18nOptions } from './i18n-options';
import { InlineOptions, ProcessBundleOptions, ProcessBundleResult } from './process-bundle';
import { maxWorkers } from './workers';

const hasThreadSupport = (() => {
  try {
    require('worker_threads');

    return true;
  } catch {
    return false;
  }
})();

// This is used to normalize serialization messaging across threads and processes
// Threads use the structured clone algorithm which handles more types
// Processes use JSON which is much more limited
const serialize = ((v8 as unknown) as { serialize(value: unknown): Buffer }).serialize;

let workerFile = require.resolve('./process-bundle');
workerFile =
  path.extname(workerFile) === '.ts'
    ? require.resolve('./process-bundle-bootstrap')
    : workerFile;

export class BundleActionExecutor {
  private largeWorker?: JestWorker;
  private smallWorker?: JestWorker;
  private cache?: BundleActionCache;

  constructor(
    private workerOptions: { cachePath?: string; i18n: I18nOptions },
    integrityAlgorithm?: string,
    private readonly sizeThreshold = 32 * 1024,
  ) {
    if (workerOptions.cachePath) {
      this.cache = new BundleActionCache(workerOptions.cachePath, integrityAlgorithm);
    }
  }

  private static executeMethod<O>(worker: JestWorker, method: string, input: unknown): Promise<O> {
    return ((worker as unknown) as Record<string, (i: unknown) => Promise<O>>)[method](input);
  }

  private ensureLarge(): JestWorker {
    if (this.largeWorker) {
      return this.largeWorker;
    }

    // larger files are processed in a separate process to limit memory usage in the main process
    return (this.largeWorker = new JestWorker(workerFile, {
      exposedMethods: ['process', 'inlineLocales'],
      setupArgs: [[...serialize(this.workerOptions)]],
      numWorkers: maxWorkers,
    }));
  }

  private ensureSmall(): JestWorker {
    if (this.smallWorker) {
      return this.smallWorker;
    }

    // small files are processed in a limited number of threads to improve speed
    // The limited number also prevents a large increase in memory usage for an otherwise short operation
    return (this.smallWorker = new JestWorker(workerFile, {
      exposedMethods: ['process', 'inlineLocales'],
      setupArgs: hasThreadSupport ? [this.workerOptions] : [[...serialize(this.workerOptions)]],
      numWorkers: os.cpus().length < 2 ? 1 : 2,
      enableWorkerThreads: hasThreadSupport,
    }));
  }

  private executeAction<O>(method: string, action: { code: string }): Promise<O> {
    // code.length is not an exact byte count but close enough for this
    if (action.code.length > this.sizeThreshold) {
      return BundleActionExecutor.executeMethod<O>(this.ensureLarge(), method, action);
    } else {
      return BundleActionExecutor.executeMethod<O>(this.ensureSmall(), method, action);
    }
  }

  async process(action: ProcessBundleOptions): Promise<ProcessBundleResult> {
    if (this.cache) {
      const cacheKeys = this.cache.generateCacheKeys(action);
      action.cacheKeys = cacheKeys;

      // Try to get cached data, if it fails fallback to processing
      try {
        const cachedResult = await this.cache.getCachedBundleResult(action);
        if (cachedResult) {
          return cachedResult;
        }
      } catch {}
    }

    return this.executeAction<ProcessBundleResult>('process', action);
  }

  processAll(actions: Iterable<ProcessBundleOptions>): AsyncIterable<ProcessBundleResult> {
    return BundleActionExecutor.executeAll(actions, action => this.process(action));
  }

  async inline(
    action: InlineOptions,
  ): Promise<{ file: string; diagnostics: { type: string; message: string }[]; count: number }> {
    return this.executeAction('inlineLocales', action);
  }

  inlineAll(actions: Iterable<InlineOptions>) {
    return BundleActionExecutor.executeAll(actions, action => this.inline(action));
  }

  private static async *executeAll<I, O>(
    actions: Iterable<I>,
    executor: (action: I) => Promise<O>,
  ): AsyncIterable<O> {
    const executions = new Map<Promise<O>, Promise<O>>();
    for (const action of actions) {
      const execution = executor(action);
      executions.set(
        execution,
        execution.then(result => {
          executions.delete(execution);

          return result;
        }),
      );
    }

    while (executions.size > 0) {
      yield Promise.race(executions.values());
    }
  }

  async stop(): Promise<void> {
    if (this.largeWorker) {
      await this.largeWorker.end();
    }
    if (this.smallWorker) {
      await this.smallWorker.end();
    }
  }
}
