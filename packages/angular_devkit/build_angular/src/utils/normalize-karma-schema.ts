
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


import { Path, virtualFs } from '@angular-devkit/core';
import { AssetPatternClass, OptimizationClass, SourceMapClass } from '../browser/schema';
import { Schema as KarmaBuilderSchema } from '../karma/schema';
import { normalizeAssetPatterns } from './normalize-asset-patterns';
import {
  NormalizedFileReplacement,
  normalizeFileReplacements,
} from './normalize-file-replacements';
import { normalizeOptimization } from './normalize-optimization';
import { normalizeSourceMaps } from './normalize-source-maps';

/**
 * A normalized webpack server builder schema.
 */
export interface NormalizedKarmaBuilderSchema extends KarmaBuilderSchema {
  sourceMap: SourceMapClass;
  fileReplacements: NormalizedFileReplacement[];
  assets: AssetPatternClass[];
  optimization: OptimizationClass;
}

export function normalizeKarmaSchema(
  host: virtualFs.Host<{}>,
  root: Path,
  projectRoot: Path,
  sourceRoot: Path | undefined,
  options: KarmaBuilderSchema,
): NormalizedKarmaBuilderSchema {
  const syncHost = new virtualFs.SyncDelegateHost(host);

  const normalizedSourceMapOptions = normalizeSourceMaps(options.sourceMap || false);
  normalizedSourceMapOptions.vendor =
    normalizedSourceMapOptions.vendor || options.vendorSourceMap || false;

  return {
    ...options,
    fileReplacements: normalizeFileReplacements(options.fileReplacements || [], syncHost, root),
    assets: normalizeAssetPatterns(options.assets || [], syncHost, root, projectRoot, sourceRoot),
    sourceMap: normalizedSourceMapOptions,
    optimization: normalizeOptimization(undefined),
  };
}
