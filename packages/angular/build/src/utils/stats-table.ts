/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { stripVTControlCharacters } from 'node:util';
import { BudgetCalculatorResult } from './bundle-calculator';
import { colors as ansiColors } from './color';
import { formatSize } from './format-bytes';

export type BundleStatsData = [
  files: string,
  names: string,
  rawSize: number | string,
  estimatedTransferSize: number | string,
];
export interface BundleStats {
  initial: boolean;
  stats: BundleStatsData;
}

export function generateEsbuildBuildStatsTable(
  [browserStats, serverStats]: [browserStats: BundleStats[], serverStats: BundleStats[]],
  colors: boolean,
  showTotalSize: boolean,
  showEstimatedTransferSize: boolean,
  budgetFailures?: BudgetCalculatorResult[],
  verbose?: boolean,
): string {
  const bundleInfo = generateBuildStatsData(
    browserStats,
    colors,
    showTotalSize,
    showEstimatedTransferSize,
    budgetFailures,
    verbose,
  );

  if (serverStats.length) {
    const m = (x: string) => (colors ? ansiColors.magenta(x) : x);
    if (browserStats.length) {
      bundleInfo.unshift([m('Browser bundles')]);
      // Add seperators between browser and server logs
      bundleInfo.push([], []);
    }

    bundleInfo.push(
      [m('Server bundles')],
      ...generateBuildStatsData(serverStats, colors, false, false, undefined, verbose),
    );
  }

  return generateTableText(bundleInfo, colors);
}

export function generateBuildStatsTable(
  data: BundleStats[],
  colors: boolean,
  showTotalSize: boolean,
  showEstimatedTransferSize: boolean,
  budgetFailures?: BudgetCalculatorResult[],
): string {
  const bundleInfo = generateBuildStatsData(
    data,
    colors,
    showTotalSize,
    showEstimatedTransferSize,
    budgetFailures,
    true,
  );

  return generateTableText(bundleInfo, colors);
}

function generateBuildStatsData(
  data: BundleStats[],
  colors: boolean,
  showTotalSize: boolean,
  showEstimatedTransferSize: boolean,
  budgetFailures?: BudgetCalculatorResult[],
  verbose?: boolean,
): (string | number)[][] {
  if (data.length === 0) {
    return [];
  }

  const g = (x: string) => (colors ? ansiColors.green(x) : x);
  const c = (x: string) => (colors ? ansiColors.cyan(x) : x);
  const r = (x: string) => (colors ? ansiColors.redBright(x) : x);
  const y = (x: string) => (colors ? ansiColors.yellowBright(x) : x);
  const bold = (x: string) => (colors ? ansiColors.bold(x) : x);
  const dim = (x: string) => (colors ? ansiColors.dim(x) : x);

  const getSizeColor = (name: string, file?: string, defaultColor = c) => {
    const severity = budgets.get(name) || (file && budgets.get(file));
    switch (severity) {
      case 'warning':
        return y;
      case 'error':
        return r;
      default:
        return defaultColor;
    }
  };

  const changedEntryChunksStats: BundleStatsData[] = [];
  const changedLazyChunksStats: BundleStatsData[] = [];

  let initialTotalRawSize = 0;
  let changedLazyChunksCount = 0;
  let initialTotalEstimatedTransferSize;
  const maxLazyChunksWithoutBudgetFailures = 15;

  const budgets = new Map<string, string>();
  if (budgetFailures) {
    for (const { label, severity } of budgetFailures) {
      // In some cases a file can have multiple budget failures.
      // Favor error.
      if (label && (!budgets.has(label) || budgets.get(label) === 'warning')) {
        budgets.set(label, severity);
      }
    }
  }

  // Sort descending by raw size
  data.sort((a, b) => {
    if (a.stats[2] > b.stats[2]) {
      return -1;
    }

    if (a.stats[2] < b.stats[2]) {
      return 1;
    }

    return 0;
  });

  for (const { initial, stats } of data) {
    const [files, names, rawSize, estimatedTransferSize] = stats;
    if (
      !initial &&
      !verbose &&
      changedLazyChunksStats.length >= maxLazyChunksWithoutBudgetFailures &&
      !budgets.has(names) &&
      !budgets.has(files)
    ) {
      // Limit the number of lazy chunks displayed in the stats table when there is no budget failure and not in verbose mode.
      changedLazyChunksCount++;
      continue;
    }

    const getRawSizeColor = getSizeColor(names, files);
    let data: BundleStatsData;
    if (showEstimatedTransferSize) {
      data = [
        g(files),
        dim(names),
        getRawSizeColor(typeof rawSize === 'number' ? formatSize(rawSize) : rawSize),
        c(
          typeof estimatedTransferSize === 'number'
            ? formatSize(estimatedTransferSize)
            : estimatedTransferSize,
        ),
      ];
    } else {
      data = [
        g(files),
        dim(names),
        getRawSizeColor(typeof rawSize === 'number' ? formatSize(rawSize) : rawSize),
        '',
      ];
    }

    if (initial) {
      changedEntryChunksStats.push(data);
      if (typeof rawSize === 'number') {
        initialTotalRawSize += rawSize;
      }
      if (showEstimatedTransferSize && typeof estimatedTransferSize === 'number') {
        if (initialTotalEstimatedTransferSize === undefined) {
          initialTotalEstimatedTransferSize = 0;
        }
        initialTotalEstimatedTransferSize += estimatedTransferSize;
      }
    } else {
      changedLazyChunksStats.push(data);
      changedLazyChunksCount++;
    }
  }

  const bundleInfo: (string | number)[][] = [];
  const baseTitles = ['Names', 'Raw size'];

  if (showEstimatedTransferSize) {
    baseTitles.push('Estimated transfer size');
  }

  // Entry chunks
  if (changedEntryChunksStats.length) {
    bundleInfo.push(['Initial chunk files', ...baseTitles].map(bold), ...changedEntryChunksStats);

    if (showTotalSize) {
      const initialSizeTotalColor = getSizeColor('bundle initial', undefined, (x) => x);
      const totalSizeElements = [
        ' ',
        'Initial total',
        initialSizeTotalColor(formatSize(initialTotalRawSize)),
      ];
      if (showEstimatedTransferSize) {
        totalSizeElements.push(
          typeof initialTotalEstimatedTransferSize === 'number'
            ? formatSize(initialTotalEstimatedTransferSize)
            : '-',
        );
      }
      bundleInfo.push([], totalSizeElements.map(bold));
    }
  }

  // Seperator
  if (changedEntryChunksStats.length && changedLazyChunksStats.length) {
    bundleInfo.push([]);
  }

  // Lazy chunks
  if (changedLazyChunksStats.length) {
    bundleInfo.push(['Lazy chunk files', ...baseTitles].map(bold), ...changedLazyChunksStats);

    if (changedLazyChunksCount > changedLazyChunksStats.length) {
      bundleInfo.push([
        dim(
          `...and ${changedLazyChunksCount - changedLazyChunksStats.length} more lazy chunks files. ` +
            'Use "--verbose" to show all the files.',
        ),
      ]);
    }
  }

  return bundleInfo;
}

function generateTableText(bundleInfo: (string | number)[][], colors: boolean): string {
  const skipText = (value: string) => value.includes('...and ');
  const longest: number[] = [];
  for (const item of bundleInfo) {
    for (let i = 0; i < item.length; i++) {
      if (item[i] === undefined) {
        continue;
      }

      const currentItem = item[i].toString();
      if (skipText(currentItem)) {
        continue;
      }

      const currentLongest = (longest[i] ??= 0);
      const currentItemLength = stripVTControlCharacters(currentItem).length;
      if (currentLongest < currentItemLength) {
        longest[i] = currentItemLength;
      }
    }
  }

  const seperator = colors ? ansiColors.dim(' | ') : ' | ';
  const outputTable: string[] = [];
  for (const item of bundleInfo) {
    for (let i = 0; i < longest.length; i++) {
      if (item[i] === undefined) {
        continue;
      }

      const currentItem = item[i].toString();
      if (skipText(currentItem)) {
        continue;
      }

      const currentItemLength = stripVTControlCharacters(currentItem).length;
      const stringPad = ' '.repeat(longest[i] - currentItemLength);
      // Values in columns at index 2 and 3 (Raw and Estimated sizes) are always right aligned.
      item[i] = i >= 2 ? stringPad + currentItem : currentItem + stringPad;
    }

    outputTable.push(item.join(seperator));
  }

  return outputTable.join('\n');
}
