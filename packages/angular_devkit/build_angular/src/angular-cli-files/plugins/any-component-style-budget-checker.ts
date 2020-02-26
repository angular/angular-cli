/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as path from 'path';
import { Compiler, Plugin } from 'webpack';
import { Budget, Type } from '../../../src/browser/schema';
import { ThresholdSeverity, calculateThresholds, checkThresholds } from '../utilities/bundle-calculator';

const PLUGIN_NAME = 'AnyComponentStyleBudgetChecker';

/**
 * Check budget sizes for component styles by emitting a warning or error if a
 * budget is exceeded by a particular component's styles.
 */
export class AnyComponentStyleBudgetChecker implements Plugin {
  private readonly budgets: Budget[];
  constructor(budgets: Budget[]) {
    this.budgets = budgets.filter((budget) => budget.type === Type.AnyComponentStyle);
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.afterOptimizeChunkAssets.tap(PLUGIN_NAME, () => {
        // In AOT compilations component styles get processed in child compilations.
        // tslint:disable-next-line: no-any
        const parentCompilation = (compilation.compiler as any).parentCompilation;
        if (!parentCompilation) {
          return;
        }

        const cssExtensions = [
          '.css',
          '.scss',
          '.less',
          '.styl',
          '.sass',
        ];

        const componentStyles = Object.keys(compilation.assets)
            .filter((name) => cssExtensions.includes(path.extname(name)))
            .map((name) => ({
              size: compilation.assets[name].size(),
              label: name,
            }));
        const thresholds = flatMap(this.budgets, (budget) => calculateThresholds(budget));

        for (const { size, label } of componentStyles) {
          for (const { severity, message } of checkThresholds(thresholds[Symbol.iterator](), size, label)) {
            switch (severity) {
              case ThresholdSeverity.Warning:
                compilation.warnings.push(message);
                break;
              case ThresholdSeverity.Error:
                compilation.errors.push(message);
                break;
              default:
                assertNever(severity);
                break;
            }
          }
        }
      });
    });
  }
}

function assertNever(input: never): never {
  throw new Error(`Unexpected call to assertNever() with input: ${
      JSON.stringify(input, null /* replacer */, 4 /* tabSize */)}`);
}

function flatMap<T, R>(list: T[], mapper: (item: T, index: number, array: T[]) => IterableIterator<R>): R[] {
  return ([] as R[]).concat(...list.map(mapper).map((iterator) => Array.from(iterator)));

}
