/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import type { createCompilerPlugin } from './angular/compiler-plugin';
import type { SourceFileCache } from './angular/source-file-cache';
import type { LoadResultCache } from './load-result-cache';

type CreateCompilerPluginParameters = Parameters<typeof createCompilerPlugin>;

export function createCompilerPluginOptions(
  options: NormalizedApplicationBuildOptions,
  sourceFileCache: SourceFileCache,
  loadResultCache?: LoadResultCache,
  templateUpdates?: Map<string, string>,
): CreateCompilerPluginParameters[0] {
  const {
    sourcemapOptions,
    tsconfig,
    fileReplacements,
    advancedOptimizations,
    jit,
    externalRuntimeStyles,
    instrumentForCoverage,
    optimizationOptions,
  } = options;
  const incremental = !!options.watch;

  return {
    sourcemap: !!sourcemapOptions.scripts && (sourcemapOptions.hidden ? 'external' : true),
    thirdPartySourcemaps: sourcemapOptions.vendor,
    tsconfig,
    jit,
    advancedOptimizations,
    fileReplacements,
    sourceFileCache,
    loadResultCache,
    incremental,
    externalRuntimeStyles,
    instrumentForCoverage,
    templateUpdates,
    includeTestMetadata: !optimizationOptions.scripts,
  };
}
