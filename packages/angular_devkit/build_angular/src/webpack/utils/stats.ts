/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { WebpackLoggingCallback } from '@angular-devkit/build-webpack';
import { logging, tags } from '@angular-devkit/core';
import assert from 'assert';
import * as path from 'path';
import textTable from 'text-table';
import { Configuration, StatsCompilation } from 'webpack';
import { Schema as BrowserBuilderOptions } from '../../builders/browser/schema';
import { normalizeOptimization } from '../../utils';
import { BudgetCalculatorResult } from '../../utils/bundle-calculator';
import { colors as ansiColors, removeColor } from '../../utils/color';
import { markAsyncChunksNonInitial } from './async-chunks';
import { WebpackStatsOptions, getStatsOptions, normalizeExtraEntryPoints } from './helpers';

export function formatSize(size: number): string {
  if (size <= 0) {
    return '0 bytes';
  }

  const abbreviations = ['bytes', 'kB', 'MB', 'GB'];
  const index = Math.floor(Math.log(size) / Math.log(1024));
  const roundedSize = size / Math.pow(1024, index);
  // bytes don't have a fraction
  const fractionDigits = index === 0 ? 0 : 2;

  return `${roundedSize.toFixed(fractionDigits)} ${abbreviations[index]}`;
}

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

function getBuildDuration(webpackStats: StatsCompilation): number {
  assert(webpackStats.builtAt, 'buildAt cannot be undefined');
  assert(webpackStats.time, 'time cannot be undefined');

  return Date.now() - webpackStats.builtAt + webpackStats.time;
}

function generateBundleStats(info: {
  rawSize?: number;
  estimatedTransferSize?: number;
  files?: string[];
  names?: string[];
  initial?: boolean;
  rendered?: boolean;
}): BundleStats {
  const rawSize = typeof info.rawSize === 'number' ? info.rawSize : '-';
  const estimatedTransferSize =
    typeof info.estimatedTransferSize === 'number' ? info.estimatedTransferSize : '-';
  const files =
    info.files
      ?.filter((f) => !f.endsWith('.map'))
      .map((f) => path.basename(f))
      .join(', ') ?? '';
  const names = info.names?.length ? info.names.join(', ') : '-';
  const initial = !!info.initial;

  return {
    initial,
    stats: [files, names, rawSize, estimatedTransferSize],
  };
}

function generateBuildStatsTable(
  data: BundleStats[],
  colors: boolean,
  showTotalSize: boolean,
  showEstimatedTransferSize: boolean,
  budgetFailures?: BudgetCalculatorResult[],
): string {
  const g = (x: string) => (colors ? ansiColors.greenBright(x) : x);
  const c = (x: string) => (colors ? ansiColors.cyanBright(x) : x);
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
  let initialTotalEstimatedTransferSize;

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

  for (const { initial, stats } of data) {
    const [files, names, rawSize, estimatedTransferSize] = stats;
    const getRawSizeColor = getSizeColor(names, files);
    let data: BundleStatsData;

    if (showEstimatedTransferSize) {
      data = [
        g(files),
        names,
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
        names,
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
    }
  }

  const bundleInfo: (string | number)[][] = [];
  const baseTitles = ['Names', 'Raw Size'];
  const tableAlign: ('l' | 'r')[] = ['l', 'l', 'r'];

  if (showEstimatedTransferSize) {
    baseTitles.push('Estimated Transfer Size');
    tableAlign.push('r');
  }

  // Entry chunks
  if (changedEntryChunksStats.length) {
    bundleInfo.push(['Initial Chunk Files', ...baseTitles].map(bold), ...changedEntryChunksStats);

    if (showTotalSize) {
      bundleInfo.push([]);

      const initialSizeTotalColor = getSizeColor('bundle initial', undefined, (x) => x);
      const totalSizeElements = [
        ' ',
        'Initial Total',
        initialSizeTotalColor(formatSize(initialTotalRawSize)),
      ];
      if (showEstimatedTransferSize) {
        totalSizeElements.push(
          typeof initialTotalEstimatedTransferSize === 'number'
            ? formatSize(initialTotalEstimatedTransferSize)
            : '-',
        );
      }
      bundleInfo.push(totalSizeElements.map(bold));
    }
  }

  // Seperator
  if (changedEntryChunksStats.length && changedLazyChunksStats.length) {
    bundleInfo.push([]);
  }

  // Lazy chunks
  if (changedLazyChunksStats.length) {
    bundleInfo.push(['Lazy Chunk Files', ...baseTitles].map(bold), ...changedLazyChunksStats);
  }

  return textTable(bundleInfo, {
    hsep: dim(' | '),
    stringLength: (s) => removeColor(s).length,
    align: tableAlign,
  });
}

function generateBuildStats(hash: string, time: number, colors: boolean): string {
  const w = (x: string) => (colors ? ansiColors.bold.white(x) : x);

  return `Build at: ${w(new Date().toISOString())} - Hash: ${w(hash)} - Time: ${w('' + time)}ms`;
}

// We use this cache because we can have multiple builders running in the same process,
// where each builder has different output path.

// Ideally, we should create the logging callback as a factory, but that would need a refactoring.
const runsCache = new Set<string>();

function statsToString(
  json: StatsCompilation,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statsConfig: any,
  budgetFailures?: BudgetCalculatorResult[],
): string {
  if (!json.chunks?.length) {
    return '';
  }

  const colors = statsConfig.colors;
  const rs = (x: string) => (colors ? ansiColors.reset(x) : x);

  const changedChunksStats: BundleStats[] = [];
  let unchangedChunkNumber = 0;
  let hasEstimatedTransferSizes = false;

  const isFirstRun = !runsCache.has(json.outputPath || '');

  for (const chunk of json.chunks) {
    // During first build we want to display unchanged chunks
    // but unchanged cached chunks are always marked as not rendered.
    if (!isFirstRun && !chunk.rendered) {
      continue;
    }

    const assets = json.assets?.filter((asset) => chunk.files?.includes(asset.name));
    let rawSize = 0;
    let estimatedTransferSize;
    if (assets) {
      for (const asset of assets) {
        if (asset.name.endsWith('.map')) {
          continue;
        }

        rawSize += asset.size;

        if (typeof asset.info.estimatedTransferSize === 'number') {
          if (estimatedTransferSize === undefined) {
            estimatedTransferSize = 0;
            hasEstimatedTransferSizes = true;
          }
          estimatedTransferSize += asset.info.estimatedTransferSize;
        }
      }
    }
    changedChunksStats.push(generateBundleStats({ ...chunk, rawSize, estimatedTransferSize }));
  }
  unchangedChunkNumber = json.chunks.length - changedChunksStats.length;

  runsCache.add(json.outputPath || '');

  // Sort chunks by size in descending order
  changedChunksStats.sort((a, b) => {
    if (a.stats[2] > b.stats[2]) {
      return -1;
    }

    if (a.stats[2] < b.stats[2]) {
      return 1;
    }

    return 0;
  });

  const statsTable = generateBuildStatsTable(
    changedChunksStats,
    colors,
    unchangedChunkNumber === 0,
    hasEstimatedTransferSizes,
    budgetFailures,
  );

  // In some cases we do things outside of webpack context
  // Such us index generation, service worker augmentation etc...
  // This will correct the time and include these.

  const time = getBuildDuration(json);

  if (unchangedChunkNumber > 0) {
    return (
      '\n' +
      rs(tags.stripIndents`
      ${statsTable}

      ${unchangedChunkNumber} unchanged chunks

      ${generateBuildStats(json.hash || '', time, colors)}
      `)
    );
  } else {
    return (
      '\n' +
      rs(tags.stripIndents`
      ${statsTable}

      ${generateBuildStats(json.hash || '', time, colors)}
      `)
    );
  }
}

export function statsWarningsToString(
  json: StatsCompilation,
  statsConfig: WebpackStatsOptions,
): string {
  const colors = statsConfig.colors;
  const c = (x: string) => (colors ? ansiColors.reset.cyan(x) : x);
  const y = (x: string) => (colors ? ansiColors.reset.yellow(x) : x);
  const yb = (x: string) => (colors ? ansiColors.reset.yellowBright(x) : x);

  const warnings = json.warnings ? [...json.warnings] : [];
  if (json.children) {
    warnings.push(...json.children.map((c) => c.warnings ?? []).reduce((a, b) => [...a, ...b], []));
  }

  let output = '';
  for (const warning of warnings) {
    if (typeof warning === 'string') {
      output += yb(`Warning: ${warning}\n\n`);
    } else {
      const file = warning.file || warning.moduleName;
      if (file) {
        output += c(file);
        if (warning.loc) {
          output += ':' + yb(warning.loc);
        }
        output += ' - ';
      }
      if (!/^warning/i.test(warning.message)) {
        output += y('Warning: ');
      }
      output += `${warning.message}\n\n`;
    }
  }

  return output ? '\n' + output : output;
}

export function statsErrorsToString(
  json: StatsCompilation,
  statsConfig: WebpackStatsOptions,
): string {
  const colors = statsConfig.colors;
  const c = (x: string) => (colors ? ansiColors.reset.cyan(x) : x);
  const yb = (x: string) => (colors ? ansiColors.reset.yellowBright(x) : x);
  const r = (x: string) => (colors ? ansiColors.reset.redBright(x) : x);

  const errors = json.errors ? [...json.errors] : [];
  if (json.children) {
    errors.push(...json.children.map((c) => c?.errors || []).reduce((a, b) => [...a, ...b], []));
  }

  let output = '';
  for (const error of errors) {
    if (typeof error === 'string') {
      output += r(`Error: ${error}\n\n`);
    } else {
      let file = error.file || error.moduleName;
      // Clean up error paths
      // Ex: ./src/app/styles.scss.webpack[javascript/auto]!=!./node_modules/css-loader/dist/cjs.js....
      // to ./src/app/styles.scss.webpack
      if (file && !statsConfig.errorDetails) {
        const webpackPathIndex = file.indexOf('.webpack[');
        if (webpackPathIndex !== -1) {
          file = file.substring(0, webpackPathIndex);
        }
      }

      if (file) {
        output += c(file);
        if (error.loc) {
          output += ':' + yb(error.loc);
        }
        output += ' - ';
      }

      // In most cases webpack will add stack traces to error messages.
      // This below cleans up the error from stacks.
      // See: https://github.com/webpack/webpack/issues/15980
      const message = statsConfig.errorStack
        ? error.message
        : /[\s\S]+?(?=\n+\s+at\s)/.exec(error.message)?.[0] ?? error.message;

      if (!/^error/i.test(message)) {
        output += r('Error: ');
      }
      output += `${message}\n\n`;
    }
  }

  return output ? '\n' + output : output;
}

export function statsHasErrors(json: StatsCompilation): boolean {
  return !!(json.errors?.length || json.children?.some((c) => c.errors?.length));
}

export function statsHasWarnings(json: StatsCompilation): boolean {
  return !!(json.warnings?.length || json.children?.some((c) => c.warnings?.length));
}

export function createWebpackLoggingCallback(
  options: BrowserBuilderOptions,
  logger: logging.LoggerApi,
): WebpackLoggingCallback {
  const { verbose = false, scripts = [], styles = [] } = options;
  const extraEntryPoints = [
    ...normalizeExtraEntryPoints(styles, 'styles'),
    ...normalizeExtraEntryPoints(scripts, 'scripts'),
  ];

  return (stats, config) => {
    if (verbose) {
      logger.info(stats.toString(config.stats));
    }

    const rawStats = stats.toJson(getStatsOptions(false));
    const webpackStats = {
      ...rawStats,
      chunks: markAsyncChunksNonInitial(rawStats, extraEntryPoints),
    };

    webpackStatsLogger(logger, webpackStats, config);
  };
}

export interface BuildEventStats {
  aot: boolean;
  optimization: boolean;
  allChunksCount: number;
  lazyChunksCount: number;
  initialChunksCount: number;
  changedChunksCount?: number;
  durationInMs: number;
  cssSizeInBytes: number;
  jsSizeInBytes: number;
  ngComponentCount: number;
}

export function generateBuildEventStats(
  webpackStats: StatsCompilation,
  browserBuilderOptions: BrowserBuilderOptions,
): BuildEventStats {
  const { chunks = [], assets = [] } = webpackStats;

  let jsSizeInBytes = 0;
  let cssSizeInBytes = 0;
  let initialChunksCount = 0;
  let ngComponentCount = 0;
  let changedChunksCount = 0;

  const allChunksCount = chunks.length;
  const isFirstRun = !runsCache.has(webpackStats.outputPath || '');

  const chunkFiles = new Set<string>();
  for (const chunk of chunks) {
    if (!isFirstRun && chunk.rendered) {
      changedChunksCount++;
    }

    if (chunk.initial) {
      initialChunksCount++;
    }

    for (const file of chunk.files ?? []) {
      chunkFiles.add(file);
    }
  }

  for (const asset of assets) {
    if (asset.name.endsWith('.map') || !chunkFiles.has(asset.name)) {
      continue;
    }

    if (asset.name.endsWith('.js')) {
      jsSizeInBytes += asset.size;
      ngComponentCount += asset.info.ngComponentCount ?? 0;
    } else if (asset.name.endsWith('.css')) {
      cssSizeInBytes += asset.size;
    }
  }

  return {
    optimization: !!normalizeOptimization(browserBuilderOptions.optimization).scripts,
    aot: browserBuilderOptions.aot !== false,
    allChunksCount,
    lazyChunksCount: allChunksCount - initialChunksCount,
    initialChunksCount,
    changedChunksCount,
    durationInMs: getBuildDuration(webpackStats),
    cssSizeInBytes,
    jsSizeInBytes,
    ngComponentCount,
  };
}

export function webpackStatsLogger(
  logger: logging.LoggerApi,
  json: StatsCompilation,
  config: Configuration,
  budgetFailures?: BudgetCalculatorResult[],
): void {
  logger.info(statsToString(json, config.stats, budgetFailures));

  if (typeof config.stats !== 'object') {
    throw new Error('Invalid Webpack stats configuration.');
  }

  if (statsHasWarnings(json)) {
    logger.warn(statsWarningsToString(json, config.stats));
  }

  if (statsHasErrors(json)) {
    logger.error(statsErrorsToString(json, config.stats));
  }
}
