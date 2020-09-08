/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler } from 'webpack';
import { Budget } from '../../browser/schema';
import { ThresholdSeverity, checkBudgets } from '../../utils/bundle-calculator';
import { ProcessBundleResult } from '../../utils/process-bundle';
import { addError, addWarning } from '../../utils/webpack-diagnostics';

export interface BundleBudgetPluginOptions {
  budgets: Budget[];
}

export class BundleBudgetPlugin {
  constructor(private options: BundleBudgetPluginOptions) { }

  apply(compiler: Compiler): void {
    const { budgets } = this.options;

    if (!budgets || budgets.length === 0) {
      return;
    }

    compiler.hooks.afterEmit.tap('BundleBudgetPlugin', (compilation) => {
      // No process bundle results because this plugin is only used when differential
      // builds are disabled.
      const processResults: ProcessBundleResult[] = [];

      const stats = compilation.getStats().toJson();
      for (const { severity, message } of checkBudgets(budgets, stats, processResults)) {
        switch (severity) {
          case ThresholdSeverity.Warning:
            addWarning(compilation, `budgets: ${message}`);
            break;
          case ThresholdSeverity.Error:
            addError(compilation, `budgets: ${message}`);
            break;
        }
      }
    });
  }
}
