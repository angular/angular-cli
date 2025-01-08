/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Budget as BudgetEntry, Type as BudgetType } from '../builders/application/schema';
import { formatSize } from './format-bytes';

// Re-export to avoid direct schema importing throughout code
export { type BudgetEntry, BudgetType };

export const BYTES_IN_KILOBYTE = 1000;

interface Size {
  size: number;
  label?: string;
}

export interface Threshold {
  limit: number;
  type: ThresholdType;
  severity: ThresholdSeverity;
}

enum ThresholdType {
  Max = 'maximum',
  Min = 'minimum',
}

export enum ThresholdSeverity {
  Warning = 'warning',
  Error = 'error',
}

export interface BudgetCalculatorResult {
  severity: ThresholdSeverity;
  message: string;
  label?: string;
}

export interface BudgetChunk {
  files?: string[];
  names?: string[];
  initial?: boolean;
}

export interface BudgetAsset {
  name: string;
  size: number;
  componentStyle?: boolean;
}

export interface BudgetStats {
  chunks?: BudgetChunk[];
  assets?: BudgetAsset[];
}

export function* calculateThresholds(budget: BudgetEntry): IterableIterator<Threshold> {
  if (budget.maximumWarning) {
    yield {
      limit: calculateBytes(budget.maximumWarning, budget.baseline, 1),
      type: ThresholdType.Max,
      severity: ThresholdSeverity.Warning,
    };
  }

  if (budget.maximumError) {
    yield {
      limit: calculateBytes(budget.maximumError, budget.baseline, 1),
      type: ThresholdType.Max,
      severity: ThresholdSeverity.Error,
    };
  }

  if (budget.minimumWarning) {
    yield {
      limit: calculateBytes(budget.minimumWarning, budget.baseline, -1),
      type: ThresholdType.Min,
      severity: ThresholdSeverity.Warning,
    };
  }

  if (budget.minimumError) {
    yield {
      limit: calculateBytes(budget.minimumError, budget.baseline, -1),
      type: ThresholdType.Min,
      severity: ThresholdSeverity.Error,
    };
  }

  if (budget.warning) {
    yield {
      limit: calculateBytes(budget.warning, budget.baseline, -1),
      type: ThresholdType.Min,
      severity: ThresholdSeverity.Warning,
    };

    yield {
      limit: calculateBytes(budget.warning, budget.baseline, 1),
      type: ThresholdType.Max,
      severity: ThresholdSeverity.Warning,
    };
  }

  if (budget.error) {
    yield {
      limit: calculateBytes(budget.error, budget.baseline, -1),
      type: ThresholdType.Min,
      severity: ThresholdSeverity.Error,
    };

    yield {
      limit: calculateBytes(budget.error, budget.baseline, 1),
      type: ThresholdType.Max,
      severity: ThresholdSeverity.Error,
    };
  }
}

/**
 * Calculates the sizes for bundles in the budget type provided.
 */
function calculateSizes(budget: BudgetEntry, stats: BudgetStats): Size[] {
  type CalculatorTypes = {
    new (budget: BudgetEntry, chunks: BudgetChunk[], assets: BudgetAsset[]): Calculator;
  };
  const calculatorMap: Record<BudgetType, CalculatorTypes> = {
    all: AllCalculator,
    allScript: AllScriptCalculator,
    any: AnyCalculator,
    anyScript: AnyScriptCalculator,
    anyComponentStyle: AnyComponentStyleCalculator,
    bundle: BundleCalculator,
    initial: InitialCalculator,
  };

  const ctor = calculatorMap[budget.type];
  const { chunks, assets } = stats;
  if (!chunks) {
    throw new Error('Webpack stats output did not include chunk information.');
  }
  if (!assets) {
    throw new Error('Webpack stats output did not include asset information.');
  }

  const calculator = new ctor(budget, chunks, assets);

  return calculator.calculate();
}

abstract class Calculator {
  constructor(
    protected budget: BudgetEntry,
    protected chunks: BudgetChunk[],
    protected assets: BudgetAsset[],
  ) {}

  abstract calculate(): Size[];

  /** Calculates the size of the given chunk for the provided build type. */
  protected calculateChunkSize(chunk: BudgetChunk): number {
    // No differential builds, get the chunk size by summing its assets.
    if (!chunk.files) {
      return 0;
    }

    return chunk.files
      .filter((file) => !file.endsWith('.map'))
      .map((file) => {
        const asset = this.assets.find((asset) => asset.name === file);
        if (!asset) {
          throw new Error(`Could not find asset for file: ${file}`);
        }

        return asset.size;
      })
      .reduce((l, r) => l + r, 0);
  }

  protected getAssetSize(asset: BudgetAsset): number {
    return asset.size;
  }
}

/**
 * A named bundle.
 */
class BundleCalculator extends Calculator {
  calculate() {
    const budgetName = this.budget.name;
    if (!budgetName) {
      return [];
    }

    const size = this.chunks
      .filter((chunk) => chunk?.names?.includes(budgetName))
      .map((chunk) => this.calculateChunkSize(chunk))
      .reduce((l, r) => l + r, 0);

    return [{ size, label: this.budget.name }];
  }
}

/**
 * The sum of all initial chunks (marked as initial).
 */
class InitialCalculator extends Calculator {
  calculate() {
    return [
      {
        label: `bundle initial`,
        size: this.chunks
          .filter((chunk) => chunk.initial)
          .map((chunk) => this.calculateChunkSize(chunk))
          .reduce((l, r) => l + r, 0),
      },
    ];
  }
}

/**
 * The sum of all the scripts portions.
 */
class AllScriptCalculator extends Calculator {
  calculate() {
    const size = this.assets
      .filter((asset) => asset.name.endsWith('.js'))
      .map((asset) => this.getAssetSize(asset))
      .reduce((total: number, size: number) => total + size, 0);

    return [{ size, label: 'total scripts' }];
  }
}

/**
 * All scripts and assets added together.
 */
class AllCalculator extends Calculator {
  calculate() {
    const size = this.assets
      .filter((asset) => !asset.name.endsWith('.map'))
      .map((asset) => this.getAssetSize(asset))
      .reduce((total: number, size: number) => total + size, 0);

    return [{ size, label: 'total' }];
  }
}

/**
 * Any script, individually.
 */
class AnyScriptCalculator extends Calculator {
  calculate() {
    return this.assets
      .filter((asset) => asset.name.endsWith('.js'))
      .map((asset) => ({
        size: this.getAssetSize(asset),
        label: asset.name,
      }));
  }
}

/**
 * Any script or asset (images, css, etc).
 */
class AnyCalculator extends Calculator {
  calculate() {
    return this.assets
      .filter((asset) => !asset.name.endsWith('.map'))
      .map((asset) => ({
        size: this.getAssetSize(asset),
        label: asset.name,
      }));
  }
}

/**
 * Any compoonent stylesheet
 */
class AnyComponentStyleCalculator extends Calculator {
  calculate() {
    return this.assets
      .filter((asset) => asset.componentStyle)
      .map((asset) => ({
        size: this.getAssetSize(asset),
        label: asset.name,
      }));
  }
}

/**
 * Calculate the bytes given a string value.
 */
function calculateBytes(input: string, baseline?: string, factor: 1 | -1 = 1): number {
  const matches = input.trim().match(/^(\d+(?:\.\d+)?)[ \t]*(%|[kmg]?b)?$/i);
  if (!matches) {
    return NaN;
  }

  const baselineBytes = (baseline && calculateBytes(baseline)) || 0;

  let value = Number(matches[1]);
  switch (matches[2] && matches[2].toLowerCase()) {
    case '%':
      value = (baselineBytes * value) / 100;
      break;
    case 'kb':
      value *= BYTES_IN_KILOBYTE;
      break;
    case 'mb':
      value *= BYTES_IN_KILOBYTE * BYTES_IN_KILOBYTE;
      break;
    case 'gb':
      value *= BYTES_IN_KILOBYTE * BYTES_IN_KILOBYTE * BYTES_IN_KILOBYTE;
      break;
  }

  if (baselineBytes === 0) {
    return value;
  }

  return baselineBytes + value * factor;
}

export function* checkBudgets(
  budgets: BudgetEntry[],
  stats: BudgetStats,
  checkComponentStyles?: boolean,
): IterableIterator<BudgetCalculatorResult> {
  // Ignore AnyComponentStyle budgets as these are handled in `AnyComponentStyleBudgetChecker` unless requested
  const computableBudgets = checkComponentStyles
    ? budgets
    : budgets.filter((budget) => budget.type !== BudgetType.AnyComponentStyle);

  for (const budget of computableBudgets) {
    const sizes = calculateSizes(budget, stats);
    for (const { size, label } of sizes) {
      yield* checkThresholds(calculateThresholds(budget), size, label);
    }
  }
}

export function* checkThresholds(
  thresholds: Iterable<Threshold>,
  size: number,
  label?: string,
): IterableIterator<BudgetCalculatorResult> {
  for (const threshold of thresholds) {
    switch (threshold.type) {
      case ThresholdType.Max: {
        if (size <= threshold.limit) {
          continue;
        }

        const sizeDifference = formatSize(size - threshold.limit);
        yield {
          severity: threshold.severity,
          label,
          message: `${label} exceeded maximum budget. Budget ${formatSize(
            threshold.limit,
          )} was not met by ${sizeDifference} with a total of ${formatSize(size)}.`,
        };
        break;
      }
      case ThresholdType.Min: {
        if (size >= threshold.limit) {
          continue;
        }

        const sizeDifference = formatSize(threshold.limit - size);
        yield {
          severity: threshold.severity,
          label,
          message: `${label} failed to meet minimum budget. Budget ${formatSize(
            threshold.limit,
          )} was not met by ${sizeDifference} with a total of ${formatSize(size)}.`,
        };
        break;
      }
      default: {
        throw new Error(`Unexpected threshold type: ${ThresholdType[threshold.type]}`);
      }
    }
  }
}
