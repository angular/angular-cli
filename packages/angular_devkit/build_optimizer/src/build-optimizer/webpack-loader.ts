/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { RawSourceMap } from 'source-map';
import * as webpack from 'webpack'; // tslint:disable-line:no-implicit-dependencies
import { SourceMapSource } from 'webpack-sources';
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
      // Use http://sokra.github.io/source-map-visualization/ to validate sourcemaps make sense.

      // The last argument is not yet in the typings
      // tslint:disable-next-line: no-any
      newSourceMap = new (SourceMapSource as any)(
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

  // Webpack typings for previousSourceMap are wrong, they are JSON objects and not strings.
  // tslint:disable-next-line:no-any
  callback(null, newContent, newSourceMap as any);
}
