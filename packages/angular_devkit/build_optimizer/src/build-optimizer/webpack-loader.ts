/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { RawSourceMap, SourceMapConsumer, SourceMapGenerator } from 'source-map';
import * as webpack from 'webpack';
const loaderUtils = require('loader-utils');

import { buildOptimizer } from './build-optimizer';


interface BuildOptimizerLoaderOptions {
  sourceMap: boolean;
}

export default function buildOptimizerLoader
  (this: webpack.loader.LoaderContext, content: string, previousSourceMap: RawSourceMap) {
  this.cacheable();
  const options: BuildOptimizerLoaderOptions = loaderUtils.getOptions(this) || {};

  const boOutput = buildOptimizer({
    content,
    inputFilePath: this.resourcePath,
    // Add a name to the build optimizer output.
    // Without a name the sourcemaps cannot be properly chained.
    outputFilePath: this.resourcePath + '.build-optimizer.js',
    emitSourceMap: options.sourceMap,
  });

  if (boOutput.emitSkipped || boOutput.content === null) {
    // Webpack typings for previousSourceMap are wrong, they are JSON objects and not strings.
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

      // Fill in the intermediate sourcemap sources as the previous sourcemap sources.
      if (previousSourceMap.sources) {
        intermediateSourceMap.sources = previousSourceMap.sources;
      }

      // Chain the sourcemaps.
      const consumer = new SourceMapConsumer(intermediateSourceMap);
      const generator = SourceMapGenerator.fromSourceMap(consumer);
      generator.applySourceMap(new SourceMapConsumer(previousSourceMap));
      newSourceMap = generator.toJSON();
    } else {
      // Otherwise just return our generated sourcemap.
      newSourceMap = intermediateSourceMap;
    }
  }

  // Webpack typings for previousSourceMap are wrong, they are JSON objects and not strings.
  // tslint:disable-next-line:no-any
  this.callback(null, newContent, newSourceMap as any);
}
