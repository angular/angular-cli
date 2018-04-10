// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Size, calculateBytes, calculateSizes } from '../utilities/bundle-calculator';
import { Budget } from '../../browser/schema';
import { formatSize } from '../utilities/stats';

interface Thresholds {
  maximumWarning?: number;
  maximumError?: number;
  minimumWarning?: number;
  minimumError?: number;
  warningLow?: number;
  warningHigh?: number;
  errorLow?: number;
  errorHigh?: number;
}

export interface BundleBudgetPluginOptions {
  budgets: Budget[];
}

export class BundleBudgetPlugin {
  constructor(private options: BundleBudgetPluginOptions) { }

  apply(compiler: any): void {
    const { budgets } = this.options;
    compiler.hooks.afterEmit.tap('BundleBudgetPlugin', (compilation: any) => {
      if (!budgets || budgets.length === 0) {
        return;
      }

      budgets.map(budget => {
        const thresholds = this.calculate(budget);
        return {
          budget,
          thresholds,
          sizes: calculateSizes(budget, compilation)
        };
      })
        .forEach(budgetCheck => {
          budgetCheck.sizes.forEach(size => {
            this.checkMaximum(budgetCheck.thresholds.maximumWarning, size, compilation.warnings);
            this.checkMaximum(budgetCheck.thresholds.maximumError, size, compilation.errors);
            this.checkMinimum(budgetCheck.thresholds.minimumWarning, size, compilation.warnings);
            this.checkMinimum(budgetCheck.thresholds.minimumError, size, compilation.errors);
            this.checkMinimum(budgetCheck.thresholds.warningLow, size, compilation.warnings);
            this.checkMaximum(budgetCheck.thresholds.warningHigh, size, compilation.warnings);
            this.checkMinimum(budgetCheck.thresholds.errorLow, size, compilation.errors);
            this.checkMaximum(budgetCheck.thresholds.errorHigh, size, compilation.errors);
          });

        });
    });
  }

  private checkMinimum(threshold: number | undefined, size: Size, messages: any) {
    if (threshold) {
      if (threshold > size.size) {
        const sizeDifference = formatSize(threshold - size.size);
        messages.push(`budgets, minimum exceeded for ${size.label}. `
          + `Budget ${formatSize(threshold)} was not reached by ${sizeDifference}.`);
      }
    }
  }

  private checkMaximum(threshold: number | undefined, size: Size, messages: any) {
    if (threshold) {
      if (threshold < size.size) {
        const sizeDifference = formatSize(size.size - threshold);
        messages.push(`budgets, maximum exceeded for ${size.label}. `
          + `Budget ${formatSize(threshold)} was exceeded by ${sizeDifference}.`);
      }
    }
  }

  private calculate(budget: Budget): Thresholds {
    let thresholds: Thresholds = {};
    if (budget.maximumWarning) {
      thresholds.maximumWarning = calculateBytes(budget.maximumWarning, budget.baseline, 'pos');
    }

    if (budget.maximumError) {
      thresholds.maximumError = calculateBytes(budget.maximumError, budget.baseline, 'pos');
    }

    if (budget.minimumWarning) {
      thresholds.minimumWarning = calculateBytes(budget.minimumWarning, budget.baseline, 'neg');
    }

    if (budget.minimumError) {
      thresholds.minimumError = calculateBytes(budget.minimumError, budget.baseline, 'neg');
    }

    if (budget.warning) {
      thresholds.warningLow = calculateBytes(budget.warning, budget.baseline, 'neg');
    }

    if (budget.warning) {
      thresholds.warningHigh = calculateBytes(budget.warning, budget.baseline, 'pos');
    }

    if (budget.error) {
      thresholds.errorLow = calculateBytes(budget.error, budget.baseline, 'neg');
    }

    if (budget.error) {
      thresholds.errorHigh = calculateBytes(budget.error, budget.baseline, 'pos');
    }

    return thresholds;
  }
}
