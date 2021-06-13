/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { RawSourceMap } from 'source-map';
import { sources } from 'webpack';
import { buildOptimizer } from './build-optimizer';

interface BuildOptimizerLoaderOptions {
  sourceMap: boolean;
}

export const buildOptimizerLoaderPath = __filename;

const alwaysProcess = (path: string) => path.endsWith('.ts') || path.endsWith('.tsx');

export default function buildOptimizerLoader(
  // Webpack 5 does not provide a LoaderContext type
  this: {
    resourcePath: string;
    _module: { factoryMeta: { skipBuildOptimizer?: boolean; sideEffectFree?: boolean } };
    cacheable(): void;
    callback(error?: Error | null, content?: string, sourceMap?: unknown): void;
    getOptions(): unknown;
  },
  content: string,
  previousSourceMap: RawSourceMap,
) {
  this.cacheable();

  const skipBuildOptimizer =
    this._module && this._module.factoryMeta && this._module.factoryMeta.skipBuildOptimizer;

  if (!alwaysProcess(this.resourcePath) && skipBuildOptimizer) {
    // Skip loading processing this file with Build Optimizer if we determined in
    // BuildOptimizerWebpackPlugin that we shouldn't.
    this.callback(null, content, previousSourceMap);

    return;
  }

  const options = (this.getOptions() || {}) as BuildOptimizerLoaderOptions;

  const boOutput = buildOptimizer({
    content,
    originalFilePath: this.resourcePath,
    inputFilePath: this.resourcePath,
    outputFilePath: this.resourcePath,
    emitSourceMap: options.sourceMap,
    isSideEffectFree:
      this._module && this._module.factoryMeta && this._module.factoryMeta.sideEffectFree,
  });

  if (boOutput.emitSkipped || boOutput.content === null) {
    this.callback(null, content, previousSourceMap);

    return;
  }

  const intermediateSourceMap = boOutput.sourceMap;
  let newContent = boOutput.content;

  let newSourceMap;

  if (options.sourceMap && intermediateSourceMap) {
    // Webpack doesn't need sourceMappingURL since we pass them on explicitely.
    newContent = newContent.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');

    if (previousSourceMap) {
      // Use http://sokra.github.io/source-map-visualization/ to validate sourcemaps make sense.
      newSourceMap = new sources.SourceMapSource(
        newContent,
        this.resourcePath,
        intermediateSourceMap,
        content,
        previousSourceMap,
        true,
      ).map();
    } else {
      // Otherwise just return our generated sourcemap.
      newSourceMap = intermediateSourceMap;
    }
  }

  this.callback(null, newContent, newSourceMap);
}
