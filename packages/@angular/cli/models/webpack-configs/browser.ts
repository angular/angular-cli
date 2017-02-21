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
  const nodeModules = path.resolve(projectRoot, 'node_modules');

  let extraPlugins: any[] = [];

  // figure out which are the lazy loaded entry points
  const lazyChunks = lazyChunksFilter([
    ...extraEntryParser(appConfig.scripts, appRoot, 'scripts'),
    ...extraEntryParser(appConfig.styles, appRoot, 'styles')
  ]);

  if (buildOptions.vendorChunk) {
    extraPlugins.push(new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      chunks: ['main'],
      minChunks: (module: any) => module.resource && module.resource.startsWith(nodeModules)
    }));
  }

  return {
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(appRoot, appConfig.index),
        filename: path.resolve(buildOptions.outputPath, appConfig.index),
        chunksSortMode: packageChunkSort(appConfig),
        excludeChunks: lazyChunks,
        xhtml: true
      }),
      new BaseHrefWebpackPlugin({
        baseHref: buildOptions.baseHref
      }),
      new webpack.optimize.CommonsChunkPlugin({
        minChunks: Infinity,
        name: 'inline'
      })
    ].concat(extraPlugins)
  };
}
