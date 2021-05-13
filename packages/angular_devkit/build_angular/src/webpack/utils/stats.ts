/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { WebpackLoggingCallback } from '@angular-devkit/build-webpack';
import { logging, tags } from '@angular-devkit/core';
import * as path from 'path';
import * as textTable from 'text-table';
import { Configuration, StatsCompilation } from 'webpack';
import { colors as ansiColors, removeColor } from '../../utils/color';
import { getWebpackStatsConfig } from '../configs/stats';

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

export type BundleStatsData = [files: string, names: string, size: number | string];

export type ChunkType = 'modern' | 'legacy' | 'unknown';

export interface BundleStats {
  initial: boolean;
  stats: BundleStatsData;
  chunkType: ChunkType;
}

export function generateBundleStats(info: {
  size?: number;
  files?: string[];
  names?: string[];
  entry?: boolean;
  initial?: boolean;
  rendered?: boolean;
  chunkType?: ChunkType;
}): BundleStats {
  const size = typeof info.size === 'number' ? info.size : '-';
  const files =
    info.files
      ?.filter((f) => !f.endsWith('.map'))
      .map((f) => path.basename(f))
      .join(', ') ?? '';
  const names = info.names?.length ? info.names.join(', ') : '-';
  const initial = !!(info.entry || info.initial);
  const chunkType = info.chunkType || 'unknown';

  return {
    chunkType,
    initial,
    stats: [files, names, size],
  };
}

function generateBuildStatsTable(
  data: BundleStats[],
  colors: boolean,
  showTotalSize: boolean,
): string {
  const g = (x: string) => (colors ? ansiColors.greenBright(x) : x);
  const c = (x: string) => (colors ? ansiColors.cyanBright(x) : x);
  const bold = (x: string) => (colors ? ansiColors.bold(x) : x);
  const dim = (x: string) => (colors ? ansiColors.dim(x) : x);

  const changedEntryChunksStats: BundleStatsData[] = [];
  const changedLazyChunksStats: BundleStatsData[] = [];

  let initialModernTotalSize = 0;
  let initialLegacyTotalSize = 0;
  let modernFileSuffix: string | undefined;

  for (const { initial, stats, chunkType } of data) {
    const [files, names, size] = stats;

    const data: BundleStatsData = [
      g(files),
      names,
      c(typeof size === 'number' ? formatSize(size) : size),
    ];

    if (initial) {
      changedEntryChunksStats.push(data);

      if (typeof size === 'number') {
        switch (chunkType) {
          case 'modern':
            initialModernTotalSize += size;
            if (!modernFileSuffix) {
              const match = files.match(/-(es20\d{2}|esnext)/);
              modernFileSuffix = match?.[1].toString().toUpperCase();
            }
            break;
          case 'legacy':
            initialLegacyTotalSize += size;
            break;
          default:
            initialModernTotalSize += size;
            initialLegacyTotalSize += size;
            break;
        }
      }
    } else {
      changedLazyChunksStats.push(data);
    }
  }

  const bundleInfo: (string | number)[][] = [];

  // Entry chunks
  if (changedEntryChunksStats.length) {
    bundleInfo.push(['Initial Chunk Files', 'Names', 'Size'].map(bold), ...changedEntryChunksStats);

    if (showTotalSize) {
      bundleInfo.push([]);
      if (initialModernTotalSize === initialLegacyTotalSize) {
        bundleInfo.push([' ', 'Initial Total', formatSize(initialModernTotalSize)].map(bold));
      } else {
        bundleInfo.push(
          [' ', 'Initial ES5 Total', formatSize(initialLegacyTotalSize)].map(bold),
          [' ', `Initial ${modernFileSuffix} Total`, formatSize(initialModernTotalSize)].map(bold),
        );
      }
    }
  }

  // Seperator
  if (changedEntryChunksStats.length && changedLazyChunksStats.length) {
    bundleInfo.push([]);
  }

  // Lazy chunks
  if (changedLazyChunksStats.length) {
    bundleInfo.push(['Lazy Chunk Files', 'Names', 'Size'].map(bold), ...changedLazyChunksStats);
  }

  return textTable(bundleInfo, {
    hsep: dim(' | '),
    stringLength: (s) => removeColor(s).length,
    align: ['l', 'l', 'r'],
  });
}

function generateBuildStats(hash: string, time: number, colors: boolean): string {
  const w = (x: string) => (colors ? ansiColors.bold.white(x) : x);

  return `Build at: ${w(new Date().toISOString())} - Hash: ${w(hash)} - Time: ${w('' + time)}ms`;
}

function statsToString(
  json: StatsCompilation,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statsConfig: any,
  bundleState?: BundleStats[],
): string {
  if (!json.chunks?.length) {
    return '';
  }

  const colors = statsConfig.colors;
  const rs = (x: string) => (colors ? ansiColors.reset(x) : x);

  const changedChunksStats: BundleStats[] = bundleState ?? [];
  let unchangedChunkNumber = 0;
  if (!bundleState?.length) {
    for (const chunk of json.chunks) {
      if (!chunk.rendered) {
        continue;
      }

      const assets = json.assets?.filter((asset) => chunk.files?.includes(asset.name));
      const summedSize = assets
        ?.filter((asset) => !asset.name.endsWith('.map'))
        .reduce((total, asset) => total + asset.size, 0);
      changedChunksStats.push(generateBundleStats({ ...chunk, size: summedSize }));
    }
    unchangedChunkNumber = json.chunks.length - changedChunksStats.length;
  }

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
  );

  // In some cases we do things outside of webpack context
  // Such us index generation, service worker augmentation etc...
  // This will correct the time and include these.
  let time = 0;
  if (json.builtAt !== undefined && json.time !== undefined) {
    time = Date.now() - json.builtAt + json.time;
  }

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

export const IGNORE_WARNINGS = [
  // Webpack 5+ has no facility to disable this warning.
  // System.import is used in @angular/core for deprecated string-form lazy routes
  /System.import\(\) is deprecated and will be removed soon/i,
  // https://github.com/webpack-contrib/source-map-loader/blob/b2de4249c7431dd8432da607e08f0f65e9d64219/src/index.js#L83
  /Failed to parse source map from/,
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function statsWarningsToString(json: StatsCompilation, statsConfig: any): string {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function statsErrorsToString(json: StatsCompilation, statsConfig: any): string {
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
      const file = error.file || error.moduleName;
      if (file) {
        output += c(file);
        if (error.loc) {
          output += ':' + yb(error.loc);
        }
        output += ' - ';
      }
      if (!/^error/i.test(error.message)) {
        output += r('Error: ');
      }
      output += `${error.message}\n\n`;
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
  verbose: boolean,
  logger: logging.LoggerApi,
): WebpackLoggingCallback {
  return (stats, config) => {
    if (verbose) {
      logger.info(stats.toString(config.stats));
    }

    webpackStatsLogger(logger, stats.toJson(getWebpackStatsConfig(false)), config);
  };
}

export function webpackStatsLogger(
  logger: logging.LoggerApi,
  json: StatsCompilation,
  config: Configuration,
  bundleStats?: BundleStats[],
): void {
  logger.info(statsToString(json, config.stats, bundleStats));

  if (statsHasWarnings(json)) {
    logger.warn(statsWarningsToString(json, config.stats));
  }
  if (statsHasErrors(json)) {
    logger.error(statsErrorsToString(json, config.stats));
  }
}
