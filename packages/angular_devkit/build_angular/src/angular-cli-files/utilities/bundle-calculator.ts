/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as webpack from 'webpack';
import { ProcessBundleFile, ProcessBundleResult } from '../../../src/utils/process-bundle';
import { Budget, Type } from '../../browser/schema';
import { formatSize } from '../utilities/stats';

interface Size {
  size: number;
  label?: string;
}

interface Threshold {
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

enum DifferentialBuildType {
  ORIGINAL = 'es2015',
  DOWNLEVEL = 'es5',
}

export function* calculateThresholds(budget: Budget): IterableIterator<Threshold> {
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
function calculateSizes(
  budget: Budget,
  stats: webpack.Stats.ToJsonOutput,
  processResults: ProcessBundleResult[],
): Size[] {
  if (budget.type === Type.AnyComponentStyle) {
    // Component style size information is not available post-build, this must
    // be checked mid-build via the `AnyComponentStyleBudgetChecker` plugin.
    throw new Error('Can not calculate size of AnyComponentStyle. Use `AnyComponentStyleBudgetChecker` instead.');
  }

  type NonComponentStyleBudgetTypes = Exclude<Budget['type'], Type.AnyComponentStyle>;
  const calculatorMap: Record<NonComponentStyleBudgetTypes, { new(...args: unknown[]): Calculator }> = {
    all: AllCalculator,
    allScript: AllScriptCalculator,
    any: AnyCalculator,
    anyScript: AnyScriptCalculator,
    bundle: BundleCalculator,
    initial: InitialCalculator,
  };

  const ctor = calculatorMap[budget.type];
  const {chunks, assets} = stats;
  if (!chunks) {
    throw new Error('Webpack stats output did not include chunk information.');
  }
  if (!assets) {
    throw new Error('Webpack stats output did not include asset information.');
  }

  const calculator = new ctor(budget, chunks, assets, processResults);

  return calculator.calculate();
}

type ArrayElement<T> = T extends Array<infer U> ? U : never;
type Chunk = ArrayElement<Exclude<webpack.Stats.ToJsonOutput['chunks'], undefined>>;
type Asset = ArrayElement<Exclude<webpack.Stats.ToJsonOutput['assets'], undefined>>;
abstract class Calculator {
  constructor (
    protected budget: Budget,
    protected chunks: Chunk[],
    protected assets: Asset[],
    protected processResults: ProcessBundleResult[],
  ) {}

  abstract calculate(): Size[];

  /** Calculates the size of the given chunk for the provided build type. */
  protected calculateChunkSize(
    chunk: Chunk,
    buildType: DifferentialBuildType,
  ): number {
    // Look for a process result containing different builds for this chunk.
    const processResult = this.processResults
        .find((processResult) => processResult.name === chunk.id.toString());

    if (processResult) {
      // Found a differential build, use the correct size information.
      const processResultFile = getDifferentialBuildResult(
        processResult, buildType);

      return processResultFile && processResultFile.size || 0;
    } else {
      // No differential builds, get the chunk size by summing its assets.
      return chunk.files
          .filter(file => !file.endsWith('.map'))
          .map(file => {
            const asset = this.assets.find((asset) => asset.name === file);
            if (!asset) {
              throw new Error(`Could not find asset for file: ${file}`);
            }

            return asset.size;
          })
          .reduce((l, r) => l + r, 0);
    }
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

    // The chunk may or may not have differential builds. Compute the size for
    // each then check afterwards if they are all the same.
    const buildSizes = Object.values(DifferentialBuildType).map((buildType) => {
      const size = this.chunks
          .filter(chunk => chunk.names.indexOf(budgetName) !== -1)
          .map(chunk => this.calculateChunkSize(chunk, buildType))
          .reduce((l, r) => l + r, 0);

      return {size, label: `${this.budget.name}-${buildType}`};
    });

    // If this bundle was not actually generated by a differential build, then
    // merge the results into a single value.
    if (allEquivalent(buildSizes.map((buildSize) => buildSize.size))) {
      return mergeDifferentialBuildSizes(buildSizes, budgetName);
    } else {
      return buildSizes;
    }
  }
}

/**
 * The sum of all initial chunks (marked as initial).
 */
class InitialCalculator extends Calculator {
  calculate() {
    const buildSizes = Object.values(DifferentialBuildType).map((buildType) => {
      return {
        label: `initial-${buildType}`,
        size: this.chunks
            .filter(chunk => chunk.initial)
            .map(chunk => this.calculateChunkSize(chunk, buildType))
            .reduce((l, r) => l + r, 0),
      };
    });

    // If this bundle was not actually generated by a differential build, then
    // merge the results into a single value.
    if (allEquivalent(buildSizes.map((buildSize) => buildSize.size))) {
      return mergeDifferentialBuildSizes(buildSizes, 'initial');
    } else {
      return buildSizes;
    }
  }
}

/**
 * The sum of all the scripts portions.
 */
class AllScriptCalculator extends Calculator {
  calculate() {
    const size = this.assets
      .filter(asset => asset.name.endsWith('.js'))
      .map(asset => asset.size)
      .reduce((total: number, size: number) => total + size, 0);

    return [{size, label: 'total scripts'}];
  }
}

/**
 * All scripts and assets added together.
 */
class AllCalculator extends Calculator {
  calculate() {
    const size = this.assets
      .filter(asset => !asset.name.endsWith('.map'))
      .map(asset => asset.size)
      .reduce((total: number, size: number) => total + size, 0);

    return [{size, label: 'total'}];
  }
}

/**
 * Any script, individually.
 */
class AnyScriptCalculator extends Calculator {
  calculate() {
    return this.assets
      .filter(asset => asset.name.endsWith('.js'))
      .map(asset => ({
        size: asset.size,
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
      .filter(asset => !asset.name.endsWith('.map'))
      .map(asset => ({
        size: asset.size,
        label: asset.name,
      }));
  }
}

/**
 * Calculate the bytes given a string value.
 */
function calculateBytes(
  input: string,
  baseline?: string,
  factor: 1 | -1 = 1,
): number {
  const matches = input.match(/^\s*(\d+(?:\.\d+)?)\s*(%|(?:[mM]|[kK]|[gG])?[bB])?\s*$/);
  if (!matches) {
    return NaN;
  }

  const baselineBytes = baseline && calculateBytes(baseline) || 0;

  let value = Number(matches[1]);
  switch (matches[2] && matches[2].toLowerCase()) {
    case '%':
      value = baselineBytes * value / 100;
      break;
    case 'kb':
      value *= 1024;
      break;
    case 'mb':
      value *= 1024 * 1024;
      break;
    case 'gb':
      value *= 1024 * 1024 * 1024;
      break;
  }

  if (baselineBytes === 0) {
    return value;
  }

  return baselineBytes + value * factor;
}

export function* checkBudgets(
    budgets: Budget[],
    webpackStats: webpack.Stats.ToJsonOutput,
    processResults: ProcessBundleResult[],
): IterableIterator<{ severity: ThresholdSeverity, message: string }> {
  // Ignore AnyComponentStyle budgets as these are handled in `AnyComponentStyleBudgetChecker`.
  const computableBudgets = budgets.filter((budget) => budget.type !== Type.AnyComponentStyle);

  for (const budget of computableBudgets) {
    const sizes = calculateSizes(budget, webpackStats, processResults);
    for (const { size, label } of sizes) {
      yield* checkThresholds(calculateThresholds(budget), size, label);
    }
  }
}

export function* checkThresholds(thresholds: IterableIterator<Threshold>, size: number, label?: string):
    IterableIterator<{ severity: ThresholdSeverity, message: string }> {
  for (const threshold of thresholds) {
    switch (threshold.type) {
      case ThresholdType.Max: {
        if (size <= threshold.limit) {
          continue;
        }

        const sizeDifference = formatSize(size - threshold.limit);
        yield {
          severity: threshold.severity,
          message: `Exceeded maximum budget for ${label}. Budget ${
            formatSize(threshold.limit)} was not met by ${
            sizeDifference} with a total of ${formatSize(size)}.`,
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
          message: `Failed to meet minimum budget for ${label}. Budget ${
            formatSize(threshold.limit)} was not met by ${
            sizeDifference} with a total of ${formatSize(size)}.`,
        };
        break;
      } default: {
        assertNever(threshold.type);
        break;
      }
    }
  }
}

/** Returns the {@link ProcessBundleFile} for the given {@link DifferentialBuildType}. */
function getDifferentialBuildResult(
    processResult: ProcessBundleResult, buildType: DifferentialBuildType):
    ProcessBundleFile|null {
  switch (buildType) {
    case DifferentialBuildType.ORIGINAL: return processResult.original || null;
    case DifferentialBuildType.DOWNLEVEL: return processResult.downlevel || null;
  }
}

/**
 * Merges the given differential builds into a single, non-differential value.
 *
 * Preconditions: All the sizes should be equivalent, or else they represent
 * differential builds.
 */
function mergeDifferentialBuildSizes(buildSizes: Size[], margeLabel: string): Size[] {
  if (buildSizes.length === 0) {
    return [];
  }

  // Only one size.
  return [{
    label: margeLabel,
    size: buildSizes[0].size,
  }];
}

/** Returns whether or not all items in the list are equivalent to each other. */
function allEquivalent<T>(items: T[]): boolean {
  if (items.length === 0) {
    return true;
  }

  const first = items[0];
  for (const item of items.slice(1)) {
    if (item !== first) {
      return false;
    }
  }

  return true;
}

function assertNever(input: never): never {
  throw new Error(`Unexpected call to assertNever() with input: ${
      JSON.stringify(input, null /* replacer */, 4 /* tabSize */)}`);
}
