
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


import { Path, virtualFs } from '@angular-devkit/core';
import { OptimizationClass, SourceMapClass } from '../browser/schema';
import { Schema as BuildWebpackServerSchema } from '../server/schema';
import {
  NormalizedFileReplacement,
  normalizeFileReplacements,
} from './normalize-file-replacements';
import { normalizeOptimization } from './normalize-optimization';
import { normalizeSourceMaps } from './normalize-source-maps';

/**
 * A normalized webpack server builder schema.
 */
export interface NormalizedWebpackServerBuilderSchema extends BuildWebpackServerSchema {
  sourceMap: SourceMapClass;
  fileReplacements: NormalizedFileReplacement[];
  optimization: OptimizationClass;
}

export function normalizeWebpackServerSchema(
  host: virtualFs.Host<{}>,
  root: Path,
  projectRoot: Path,
  sourceRoot: Path | undefined,
  options: BuildWebpackServerSchema,
): NormalizedWebpackServerBuilderSchema {
  const syncHost = new virtualFs.SyncDelegateHost(host);

  const normalizedSourceMapOptions = normalizeSourceMaps(options.sourceMap || {});
  normalizedSourceMapOptions.vendor =
    normalizedSourceMapOptions.vendor || options.vendorSourceMap || false;

  const optimization = options.hasOwnProperty('optimization') && options.optimization || {};

  return {
    ...options,
    fileReplacements: normalizeFileReplacements(options.fileReplacements || [], syncHost, root),
    optimization: normalizeOptimization(optimization),
    sourceMap: normalizedSourceMapOptions,
  };
}
