/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';
import { Compilation, Compiler } from 'webpack';
import { Budget, Type } from '../../browser/schema';
import {
  ThresholdSeverity,
  calculateThresholds,
  checkThresholds,
} from '../../utils/bundle-calculator';
import { addError, addWarning } from '../../utils/webpack-diagnostics';

const PLUGIN_NAME = 'AnyComponentStyleBudgetChecker';

/**
 * Check budget sizes for component styles by emitting a warning or error if a
 * budget is exceeded by a particular component's styles.
 */
export class AnyComponentStyleBudgetChecker {
  private readonly budgets: Budget[];

  constructor(budgets: Budget[]) {
    this.budgets = budgets.filter((budget) => budget.type === Type.AnyComponentStyle);
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          stage: Compilation.PROCESS_ASSETS_STAGE_ANALYSE,
        },
        () => {
          // In AOT compilations component styles get processed in child compilations.
          if (!compilation.compiler.parentCompilation) {
            return;
          }

          const cssExtensions = ['.css', '.scss', '.less', '.styl', '.sass'];

          const componentStyles = Object.keys(compilation.assets)
            .filter((name) => cssExtensions.includes(path.extname(name)))
            .map((name) => ({
              size: compilation.assets[name].size(),
              label: name,
            }));

          const thresholds = this.budgets.flatMap((budget) => [...calculateThresholds(budget)]);
          for (const { size, label } of componentStyles) {
            for (const { severity, message } of checkThresholds(
              thresholds[Symbol.iterator](),
              size,
              label,
            )) {
              switch (severity) {
                case ThresholdSeverity.Warning:
                  addWarning(compilation, message);
                  break;
                case ThresholdSeverity.Error:
                  addError(compilation, message);
                  break;
                default:
                  assertNever(severity);
              }
            }
          }
        },
      );
    });
  }
}

function assertNever(input: never): never {
  throw new Error(
    `Unexpected call to assertNever() with input: ${JSON.stringify(
      input,
      null /* replacer */,
      4 /* tabSize */,
    )}`,
  );
}
