/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Budget, calculateBytes, calculateSizes } from '../utilities/bundle-calculator';

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
  constructor(private options: BundleBudgetPluginOptions) {}

  apply(compiler: any): void {
    const { budgets } = this.options;
    compiler.plugin('after-emit', (compilation: any, cb: Function) => {
      if (!budgets || budgets.length === 0) {
        cb();
        return;
      }

      budgets.map(budget => {
        const thresholds = this.calcualte(budget);
        return {
          budget,
          thresholds,
          sizes: calculateSizes(budget, compilation)
        };
      })
      .forEach(budgetCheck => {
        budgetCheck.sizes.forEach(size => {
          if (budgetCheck.thresholds.maximumWarning) {
            if (budgetCheck.thresholds.maximumWarning < size.size) {
              compilation.warnings.push(`budgets, maximum exceeded for ${size.label}.`);
            }
          }
          if (budgetCheck.thresholds.maximumError) {
            if (budgetCheck.thresholds.maximumError < size.size) {
              compilation.errors.push(`budgets, maximum exceeded for ${size.label}.`);
            }
          }
          if (budgetCheck.thresholds.minimumWarning) {
            if (budgetCheck.thresholds.minimumWarning > size.size) {
              compilation.warnings.push(`budgets, minimum exceeded for ${size.label}.`);
            }
          }
          if (budgetCheck.thresholds.minimumError) {
            if (budgetCheck.thresholds.minimumError > size.size) {
              compilation.errors.push(`budgets, minimum exceeded for ${size.label}.`);
            }
          }
          if (budgetCheck.thresholds.warningLow) {
            if (budgetCheck.thresholds.warningLow > size.size) {
              compilation.warnings.push(`budgets, minimum exceeded for ${size.label}.`);
            }
          }
          if (budgetCheck.thresholds.warningHigh) {
            if (budgetCheck.thresholds.warningHigh < size.size) {
              compilation.warnings.push(`budgets, maximum exceeded for ${size.label}.`);
            }
          }
          if (budgetCheck.thresholds.errorLow) {
            if (budgetCheck.thresholds.errorLow > size.size) {
              compilation.errors.push(`budgets, minimum exceeded for ${size.label}.`);
            }
          }
          if (budgetCheck.thresholds.errorHigh) {
            if (budgetCheck.thresholds.errorHigh < size.size) {
              compilation.errors.push(`budgets, maximum exceeded for ${size.label}.`);
            }
          }
        });

      });
      cb();
    });
  }

  private calcualte(budget: Budget): Thresholds {
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
