/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { RawSourceMap, SourceMapConsumer, SourceMapGenerator } from 'source-map';
import * as webpack from 'webpack'; // tslint:disable-line:no-implicit-dependencies

const loaderUtils = require('loader-utils');

import { buildOptimizer } from './build-optimizer';

interface BuildOptimizerLoaderOptions {
  sourceMap: boolean;
}

export const buildOptimizerLoaderPath = __filename;

const alwaysProcess = (path: string) =>
  // Always process TS files.
  path.endsWith('.ts') ||
  path.endsWith('.tsx') ||
  // Always process factory files.
  path.endsWith('.ngfactory.js') ||
  path.endsWith('.ngstyle.js');

export default function buildOptimizerLoader(
  this: webpack.loader.LoaderContext,
  content: string,
  previousSourceMap: RawSourceMap,
) {
  this.cacheable();
  const callback = this.async();
  if (!callback) {
    throw new Error('Async loader support is required.');
  }

  const skipBuildOptimizer =
    this._module && this._module.factoryMeta && this._module.factoryMeta.skipBuildOptimizer;

  if (!alwaysProcess(this.resourcePath) && skipBuildOptimizer) {
    // Skip loading processing this file with Build Optimizer if we determined in
    // BuildOptimizerWebpackPlugin that we shouldn't.

    // Webpack typings for previousSourceMap are wrong, they are JSON objects and not strings.
    // tslint:disable-next-line:no-any
    this.callback(null, content, previousSourceMap as any);

    return;
  }

  const options: BuildOptimizerLoaderOptions = loaderUtils.getOptions(this) || {};

  // Make up names of the intermediate files so we can chain the sourcemaps.
  const inputFilePath = this.resourcePath + '.pre-build-optimizer.js';
  const outputFilePath = this.resourcePath + '.post-build-optimizer.js';

  const boOutput = buildOptimizer({
    content,
    originalFilePath: this.resourcePath,
    inputFilePath,
    outputFilePath,
    emitSourceMap: options.sourceMap,
    isSideEffectFree:
      this._module && this._module.factoryMeta && this._module.factoryMeta.sideEffectFree,
  });

  if (boOutput.emitSkipped || boOutput.content === null) {
    // tslint:disable-next-line:no-any
    this.callback(null, content, previousSourceMap as any);

    return;
  }

  const intermediateSourceMap = boOutput.sourceMap;
  let newContent = boOutput.content;

  let newSourceMap;

  if (options.sourceMap && intermediateSourceMap) {
    // Webpack doesn't need sourceMappingURL since we pass them on explicitely.
    newContent = newContent.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');

    if (previousSourceMap) {
      // If there's a previous sourcemap, we have to chain them.
      // See https://github.com/mozilla/source-map/issues/216#issuecomment-150839869 for a simple
      // source map chaining example.
      // Use http://sokra.github.io/source-map-visualization/ to validate sourcemaps make sense.

      // Force the previous sourcemap to use the filename we made up for it.
      // In order for source maps to be chained, the consumed source map `file` needs to be in the
      // consumers source map `sources` array.
      previousSourceMap.file = inputFilePath;

      // Chain the sourcemaps.
      SourceMapConsumer.with(intermediateSourceMap, null, intermediate => {
        return SourceMapConsumer.with(previousSourceMap, null, previous => {
          const generator = SourceMapGenerator.fromSourceMap(intermediate);
          generator.applySourceMap(previous);

          return generator.toJSON();
        });
        // tslint:disable-next-line: no-any
      }).then(map => callback(null, newContent, map as any), error => callback(error));

      return;
    } else {
      // Otherwise just return our generated sourcemap.
      newSourceMap = intermediateSourceMap;
    }
  }

  // Webpack typings for previousSourceMap are wrong, they are JSON objects and not strings.
  // tslint:disable-next-line:no-any
  callback(null, newContent, newSourceMap as any);
}
