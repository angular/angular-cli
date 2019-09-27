/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import JestWorker from 'jest-worker';
import * as os from 'os';

export class ActionExecutor<Input extends { size: number }, Output> {
  private largeWorker: JestWorker;
  private smallWorker: JestWorker;

  private smallThreshold = 32 * 1024;

  constructor(actionFile: string, private readonly actionName: string) {
    // larger files are processed in a separate process to limit memory usage in the main process
    this.largeWorker = new JestWorker(actionFile, {
      exposedMethods: [actionName],
    });

    // small files are processed in a limited number of threads to improve speed
    // The limited number also prevents a large increase in memory usage for an otherwise short operation
    this.smallWorker = new JestWorker(actionFile, {
      exposedMethods: [actionName],
      numWorkers: os.cpus().length < 2 ? 1 : 2,
      // Will automatically fallback to processes if not supported
      enableWorkerThreads: true,
    });
  }

  execute(options: Input): Promise<Output> {
    if (options.size > this.smallThreshold) {
      return ((this.largeWorker as unknown) as Record<string, (options: Input) => Promise<Output>>)[
        this.actionName
      ](options);
    } else {
      return ((this.smallWorker as unknown) as Record<string, (options: Input) => Promise<Output>>)[
        this.actionName
      ](options);
    }
  }

  executeAll(options: Input[]): Promise<Output[]> {
    return Promise.all(options.map(o => this.execute(o)));
  }

  stop() {
    this.largeWorker.end();
    this.smallWorker.end();
  }
}
