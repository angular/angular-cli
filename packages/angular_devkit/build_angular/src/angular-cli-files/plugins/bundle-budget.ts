/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler, compilation } from 'webpack';
import { Budget, Type } from '../../browser/schema';
import { ProcessBundleResult } from '../../utils/process-bundle';
import { ThresholdSeverity, checkBudgets } from '../utilities/bundle-calculator';

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

    compiler.hooks.afterEmit.tap('BundleBudgetPlugin', (compilation: compilation.Compilation) => {
      this.runChecks(budgets, compilation);
    });
  }

  private runChecks(budgets: Budget[], compilation: compilation.Compilation) {
    // No process bundle results because this plugin is only used when differential
    // builds are disabled.
    const processResults: ProcessBundleResult[] = [];

    const stats = compilation.getStats().toJson();
    for (const { severity, message } of checkBudgets(budgets, stats, processResults)) {
      switch (severity) {
        case ThresholdSeverity.Warning:
          compilation.warnings.push(`budgets: ${message}`);
          break;
        case ThresholdSeverity.Error:
          compilation.errors.push(`budgets: ${message}`);
          break;
      }
    }
  }
}
