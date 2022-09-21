/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { json, logging } from '@angular-devkit/core';
import {
  AssetPatternClass,
  Schema as BrowserBuilderSchema,
  SourceMapClass,
} from '../builders/browser/schema';
import { BuildOptions } from './build-options';
import { normalizeAssetPatterns } from './normalize-asset-patterns';
import { normalizeCacheOptions } from './normalize-cache';
import {
  NormalizedFileReplacement,
  normalizeFileReplacements,
} from './normalize-file-replacements';
import { NormalizedOptimizationOptions, normalizeOptimization } from './normalize-optimization';
import { normalizePolyfills } from './normalize-polyfills';
import { normalizeSourceMaps } from './normalize-source-maps';
import { getSupportedBrowsers } from './supported-browsers';

/**
 * A normalized browser builder schema.
 */
export type NormalizedBrowserBuilderSchema = BrowserBuilderSchema &
  BuildOptions & {
    sourceMap: SourceMapClass;
    assets: AssetPatternClass[];
    fileReplacements: NormalizedFileReplacement[];
    optimization: NormalizedOptimizationOptions;
    polyfills: string[];
  };

export function normalizeBrowserSchema(
  workspaceRoot: string,
  projectRoot: string,
  projectSourceRoot: string | undefined,
  options: BrowserBuilderSchema,
  metadata: json.JsonObject,
  logger: logging.LoggerApi,
): NormalizedBrowserBuilderSchema {
  return {
    ...options,
    cache: normalizeCacheOptions(metadata, workspaceRoot),
    assets: normalizeAssetPatterns(
      options.assets || [],
      workspaceRoot,
      projectRoot,
      projectSourceRoot,
    ),
    fileReplacements: normalizeFileReplacements(options.fileReplacements || [], workspaceRoot),
    optimization: normalizeOptimization(options.optimization),
    sourceMap: normalizeSourceMaps(options.sourceMap || false),
    polyfills: normalizePolyfills(options.polyfills, workspaceRoot),
    preserveSymlinks:
      options.preserveSymlinks === undefined
        ? process.execArgv.includes('--preserve-symlinks')
        : options.preserveSymlinks,
    statsJson: options.statsJson || false,
    budgets: options.budgets || [],
    scripts: options.scripts || [],
    styles: options.styles || [],
    stylePreprocessorOptions: {
      includePaths:
        (options.stylePreprocessorOptions && options.stylePreprocessorOptions.includePaths) || [],
    },
    // Using just `--poll` will result in a value of 0 which is very likely not the intention
    // A value of 0 is falsy and will disable polling rather then enable
    // 500 ms is a sensible default in this case
    poll: options.poll === 0 ? 500 : options.poll,
    supportedBrowsers: getSupportedBrowsers(projectRoot, logger),
  };
}
