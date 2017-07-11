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

  const boOutput = buildOptimizer({ content, emitSourceMap: options.sourceMap });
  const intermediateSourceMap = boOutput.sourceMap;
  let newContent = boOutput.content;

  let newSourceMap;

  if (options.sourceMap && intermediateSourceMap) {
    // Webpack doesn't need sourceMappingURL since we pass them on explicitely.
    newContent = newContent.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');

    if (!previousSourceMap) {
      // If we're emitting sourcemaps but there is no previous one, then we're the first loader.
      newSourceMap = JSON.stringify(intermediateSourceMap);
    } else {
      // If there's a previous sourcemap, we're an intermediate loader and we have to chain them.
      // Fill in the intermediate sourcemap source as the previous sourcemap file.
      intermediateSourceMap.sources = [previousSourceMap.file];
      intermediateSourceMap.file = previousSourceMap.file;

      // Chain the sourcemaps.
      const consumer = new SourceMapConsumer(intermediateSourceMap);
      const generator = SourceMapGenerator.fromSourceMap(consumer);
      generator.applySourceMap(new SourceMapConsumer(previousSourceMap));
      newSourceMap = JSON.stringify(generator.toJSON());
    }
  }

  this.callback(null, newContent, newSourceMap);
}
