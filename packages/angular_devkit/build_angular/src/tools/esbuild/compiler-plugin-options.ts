/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import type { createCompilerPlugin } from './angular/compiler-plugin';
import type { SourceFileCache } from './angular/source-file-cache';

type CreateCompilerPluginParameters = Parameters<typeof createCompilerPlugin>;

export function createCompilerPluginOptions(
  options: NormalizedApplicationBuildOptions,
  target: string[],
  sourceFileCache?: SourceFileCache,
): {
  pluginOptions: CreateCompilerPluginParameters[0];
  styleOptions: CreateCompilerPluginParameters[1];
} {
  const {
    workspaceRoot,
    optimizationOptions,
    sourcemapOptions,
    tsconfig,
    outputNames,
    fileReplacements,
    externalDependencies,
    preserveSymlinks,
    stylePreprocessorOptions,
    advancedOptimizations,
    inlineStyleLanguage,
    jit,
    tailwindConfiguration,
  } = options;

  return {
    // JS/TS options
    pluginOptions: {
      sourcemap: !!sourcemapOptions.scripts,
      thirdPartySourcemaps: sourcemapOptions.vendor,
      tsconfig,
      jit,
      advancedOptimizations,
      fileReplacements,
      sourceFileCache,
      loadResultCache: sourceFileCache?.loadResultCache,
    },
    // Component stylesheet options
    styleOptions: {
      workspaceRoot,
      optimization: !!optimizationOptions.styles.minify,
      sourcemap:
        // Hidden component stylesheet sourcemaps are inaccessible which is effectively
        // the same as being disabled. Disabling has the advantage of avoiding the overhead
        // of sourcemap processing.
        !!sourcemapOptions.styles && (sourcemapOptions.hidden ? false : 'inline'),
      outputNames,
      includePaths: stylePreprocessorOptions?.includePaths,
      externalDependencies,
      target,
      inlineStyleLanguage,
      preserveSymlinks,
      tailwindConfiguration,
      publicPath: options.publicPath,
    },
  };
}
