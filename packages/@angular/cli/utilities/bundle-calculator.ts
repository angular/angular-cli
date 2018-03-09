/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export type BudgetType = 'all' | 'allScript' | 'any' | 'anyScript' | 'bundle' | 'initial';

export interface Budget {
  /**
   * The type of budget
   */
  type: BudgetType;
  /**
   * The name of the bundle
   */
  name?: string;
  /**
   * The baseline size for comparison.
   */
  baseline?: string;
  /**
   * The maximum threshold for warning relative to the baseline.
   */
  maximumWarning?: string;
  /**
   * The maximum threshold for error relative to the baseline.
   */
  maximumError?: string;
  /**
   * The minimum threshold for warning relative to the baseline.
   */
  minimumWarning?: string;
  /**
   * The minimum threshold for error relative to the baseline.
   */
  minimumError?: string;
  /**
   * The threshold for warning relative to the baseline (min & max).
   */
  warning?: string;
  /**
   * The threshold for error relative to the baseline (min & max).
   */
  error?: string;
}

export interface Compilation {
  assets: any;
  chunks: any[];
  warnings: string[];
  errors: string[];
}

export interface Size {
  size: number;
  label?: string;
}

export function calculateSizes(budget: Budget, compilation: Compilation): Size[] {
  const calculatorMap = {
    all: AllCalculator,
    allScript: AllScriptCalculator,
    any: AnyCalculator,
    anyScript: AnyScriptCalculator,
    bundle: BundleCalculator,
    initial: InitialCalculator,
  };
  const ctor = calculatorMap[budget.type];
  const calculator = new ctor(budget, compilation);
  return calculator.calculate();
}

export abstract class Calculator {
  constructor (protected budget: Budget, protected compilation: Compilation) {}

  abstract calculate(): Size[];
}

/**
 * A named bundle.
 */
class BundleCalculator extends Calculator {
  calculate() {
    const size: number = this.compilation.chunks
      .filter(chunk => chunk.name === this.budget.name)
      .reduce((files, chunk) => [...files, ...chunk.files], [])
      .map((file: string) => this.compilation.assets[file].size())
      .reduce((total: number, size: number) => total + size, 0);
    return [{size, label: this.budget.name}];
  }
}

/**
 * The sum of all initial chunks (marked as initial by webpack).
 */
class InitialCalculator extends Calculator {
  calculate() {
    const initialChunks = this.compilation.chunks.filter(chunk => chunk.isInitial);
    const size: number = initialChunks
      .reduce((files, chunk) => [...files, ...chunk.files], [])
      .map((file: string) => this.compilation.assets[file].size())
      .reduce((total: number, size: number) => total + size, 0);
    return [{size, label: 'initial'}];
  }
}

/**
 * The sum of all the scripts portions.
 */
class AllScriptCalculator extends Calculator {
  calculate() {
    const size: number = Object.keys(this.compilation.assets)
      .filter(key => /\.js$/.test(key))
      .map(key => this.compilation.assets[key])
      .map(asset => asset.size())
      .reduce((total: number, size: number) => total + size, 0);
    return [{size, label: 'total scripts'}];
  }
}

/**
 * All scripts and assets added together.
 */
class AllCalculator extends Calculator {
  calculate() {
    const size: number = Object.keys(this.compilation.assets)
      .map(key => this.compilation.assets[key].size())
      .reduce((total: number, size: number) => total + size, 0);
    return [{size, label: 'total'}];
  }
}

/**
 * Any script, individually.
 */
class AnyScriptCalculator extends Calculator {
  calculate() {
    return Object.keys(this.compilation.assets)
      .filter(key => /\.js$/.test(key))
      .map(key => {
        const asset = this.compilation.assets[key];
        return {
          size: asset.size(),
          label: key
        };
      });
  }
}

/**
 * Any script or asset (images, css, etc).
 */
class AnyCalculator extends Calculator {
  calculate() {
    return Object.keys(this.compilation.assets)
      .map(key => {
        const asset = this.compilation.assets[key];
        return {
          size: asset.size(),
          label: key
        };
      });
  }
}

/**
 * Calculate the bytes given a string value.
 */
export function calculateBytes(val: string, baseline?: string, factor?: ('pos' | 'neg')): number {
  if (/^\d+$/.test(val)) {
    return parseFloat(val);
  }

  if (/^(\d+)%$/.test(val)) {
    return calculatePercentBytes(val, baseline, factor);
  }

  const multiplier = getMultiplier(val);

  const numberVal = parseFloat(val.replace(/((k|m|M|)b?)$/, ''));
  const baselineVal = baseline ? parseFloat(baseline.replace(/((k|m|M|)b?)$/, '')) : 0;
  const baselineMultiplier = baseline ? getMultiplier(baseline) : 1;
  const factorMultiplier = factor ? (factor === 'pos' ? 1 : -1) : 1;

  return numberVal * multiplier + baselineVal * baselineMultiplier * factorMultiplier;
}

function getMultiplier(val?: string): number {
  if (/^(\d+)b?$/.test(val)) {
    return 1;
  } else if (/^(\d+)kb$/.test(val)) {
    return 1000;
  } else if (/^(\d+)(m|M)b$/.test(val)) {
    return 1000 * 1000;
  }
}

function calculatePercentBytes(val: string, baseline?: string, factor?: ('pos' | 'neg')): number {
  const baselineBytes = calculateBytes(baseline);
  const percentage = parseFloat(val.replace(/%/g, ''));
  return baselineBytes + baselineBytes * percentage / 100 * (factor === 'pos' ? 1 : -1);
}
