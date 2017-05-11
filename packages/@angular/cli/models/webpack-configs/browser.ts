import * as fs from 'fs';
import * as webpack from 'webpack';
import * as path from 'path';
const HtmlWebpackPlugin = require('html-webpack-plugin');

import { packageChunkSort } from '../../utilities/package-chunk-sort';
import { BaseHrefWebpackPlugin } from '../../lib/base-href-webpack';
import { extraEntryParser, lazyChunksFilter } from './utils';
import { WebpackConfigOptions } from '../webpack-config';


export function getBrowserConfig(wco: WebpackConfigOptions) {
  const { projectRoot, buildOptions, appConfig } = wco;

  const appRoot = path.resolve(projectRoot, appConfig.root);

  let extraPlugins: any[] = [];

  // figure out which are the lazy loaded entry points
  const lazyChunks = lazyChunksFilter([
    ...extraEntryParser(appConfig.scripts, appRoot, 'scripts'),
    ...extraEntryParser(appConfig.styles, appRoot, 'styles')
  ]);

  if (buildOptions.vendorChunk) {
    // Separate modules from node_modules into a vendor chunk.
    const nodeModules = path.resolve(projectRoot, 'node_modules');
    // Resolves all symlink to get the actual node modules folder.
    const realNodeModules = fs.realpathSync(nodeModules);
    // --aot puts the generated *.ngfactory.ts in src/$$_gendir/node_modules.
    const genDirNodeModules = path.resolve(appRoot, '$$_gendir', 'node_modules');

    extraPlugins.push(new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      chunks: ['main'],
      minChunks: (module: any) => {
        return module.resource
            && (   module.resource.startsWith(nodeModules)
                || module.resource.startsWith(genDirNodeModules)
                || module.resource.startsWith(realNodeModules));
      }
    }));
  }

  return {
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(appRoot, appConfig.index),
        filename: path.resolve(buildOptions.outputPath, appConfig.index),
        chunksSortMode: packageChunkSort(appConfig),
        excludeChunks: lazyChunks,
        xhtml: true,
        minify: buildOptions.target === 'production' ? {
          caseSensitive: true,
          collapseWhitespace: true,
          keepClosingSlash: true
        } : false
      }),
      new BaseHrefWebpackPlugin({
        baseHref: buildOptions.baseHref
      }),
      new webpack.optimize.CommonsChunkPlugin({
        async: 'common',
        children: true,
        minChunks: 2
      }),
      new webpack.optimize.CommonsChunkPlugin({
        minChunks: Infinity,
        name: 'inline'
      })
    ].concat(extraPlugins)
  };
}
