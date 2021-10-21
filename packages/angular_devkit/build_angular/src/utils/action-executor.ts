/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import Piscina from 'piscina';
import { maxWorkers } from './environment-options';
import { I18nOptions } from './i18n-options';
import { InlineOptions } from './process-bundle';

const workerFile = require.resolve('./process-bundle');

export class BundleActionExecutor {
  private workerPool?: Piscina;

  constructor(private workerOptions: { i18n: I18nOptions }) {}

  private ensureWorkerPool(): Piscina {
    if (this.workerPool) {
      return this.workerPool;
    }

    this.workerPool = new Piscina({
      filename: workerFile,
      name: 'inlineLocales',
      workerData: this.workerOptions,
      maxThreads: maxWorkers,
    });

    return this.workerPool;
  }

  async inline(
    action: InlineOptions,
  ): Promise<{ file: string; diagnostics: { type: string; message: string }[]; count: number }> {
    return this.ensureWorkerPool().run(action, { name: 'inlineLocales' });
  }

  inlineAll(actions: Iterable<InlineOptions>) {
    return BundleActionExecutor.executeAll(actions, (action) => this.inline(action));
  }

  private static async *executeAll<I, O>(
    actions: Iterable<I>,
    executor: (action: I) => Promise<O>,
  ): AsyncIterable<O> {
    const executions = new Map<Promise<O>, Promise<[Promise<O>, O]>>();
    for (const action of actions) {
      const execution = executor(action);
      executions.set(
        execution,
        execution.then((result) => [execution, result]),
      );
    }

    while (executions.size > 0) {
      const [execution, result] = await Promise.race(executions.values());
      executions.delete(execution);
      yield result;
    }
  }

  stop(): void {
    void this.workerPool?.destroy();
  }
}
