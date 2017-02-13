import * as webpack from 'webpack';
import * as path from 'path';
import { GlobCopyWebpackPlugin } from '../../plugins/glob-copy-webpack-plugin';
import { packageChunkSort } from '../../utilities/package-chunk-sort';
import { BaseHrefWebpackPlugin } from '../../lib/base-href-webpack';
import { extraEntryParser, lazyChunksFilter, getOutputHashFormat } from './utils';
import { WebpackConfigOptions } from '../webpack-config';

const autoprefixer = require('autoprefixer');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

/**
 * Enumerate loaders and their dependencies from this file to let the dependency validator
 * know they are used.
 *
 * require('source-map-loader')
 * require('raw-loader')
 * require('script-loader')
 * require('json-loader')
 * require('url-loader')
 * require('file-loader')
 */

export function getCommonConfig(wco: WebpackConfigOptions) {
  const { projectRoot, buildOptions, appConfig } = wco;

  const appRoot = path.resolve(projectRoot, appConfig.root);
  const nodeModules = path.resolve(projectRoot, 'node_modules');

  let extraPlugins: any[] = [];
  let extraRules: any[] = [];
  let entryPoints: { [key: string]: string[] } = {};

  // figure out which are the lazy loaded entry points
  const lazyChunks = lazyChunksFilter([
    ...extraEntryParser(appConfig.scripts, appRoot, 'scripts'),
    ...extraEntryParser(appConfig.styles, appRoot, 'styles')
  ]);

  if (appConfig.main) {
    entryPoints['main'] = [path.resolve(appRoot, appConfig.main)];
  }

  if (appConfig.polyfills) {
    entryPoints['polyfills'] = [path.resolve(appRoot, appConfig.polyfills)];
  }

  // determine hashing format
  const hashFormat = getOutputHashFormat(buildOptions.outputHashing);

  // process global scripts
  if (appConfig.scripts.length > 0) {
    const globalScripts = extraEntryParser(appConfig.scripts, appRoot, 'scripts');

    // add entry points and lazy chunks
    globalScripts.forEach(script => {
      let scriptPath = `script-loader!${script.path}`;
      if (script.lazy) { lazyChunks.push(script.entry); }
      entryPoints[script.entry] = (entryPoints[script.entry] || []).concat(scriptPath);
    });
  }

  if (buildOptions.vendorChunk) {
    extraPlugins.push(new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      chunks: ['main'],
      minChunks: (module: any) => module.resource && module.resource.startsWith(nodeModules)
    }));
  }

  // process asset entries
  if (appConfig.assets) {
    extraPlugins.push(new GlobCopyWebpackPlugin({
      patterns: appConfig.assets,
      globOptions: { cwd: appRoot, dot: true, ignore: '**/.gitkeep' }
    }));
  }

  if (buildOptions.progress) {
    extraPlugins.push(new ProgressPlugin({ profile: buildOptions.verbose, colors: true }));
  }

  return {
    devtool: buildOptions.sourcemap ? 'source-map' : false,
    resolve: {
      extensions: ['.ts', '.js'],
      modules: [nodeModules],
    },
    resolveLoader: {
      modules: [nodeModules]
    },
    context: projectRoot,
    entry: entryPoints,
    output: {
      path: path.resolve(projectRoot, buildOptions.outputPath),
      publicPath: buildOptions.deployUrl,
      filename: `[name]${hashFormat.chunk}.bundle.js`,
      sourceMapFilename: `[name]${hashFormat.chunk}.bundle.map`,
      chunkFilename: `[id]${hashFormat.chunk}.chunk.js`
    },
    module: {
      rules: [
        { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader', exclude: [nodeModules] },
        { test: /\.json$/, loader: 'json-loader' },
        { test: /\.html$/, loader: 'raw-loader' },
        { test: /\.(eot|svg)$/, loader: `file-loader?name=[name]${hashFormat.file}.[ext]` },
        {
          test: /\.(jpg|png|gif|otf|ttf|woff|woff2|cur|ani)$/,
          loader: `url-loader?name=[name]${hashFormat.file}.[ext]&limit=10000`
        }
      ].concat(extraRules)
    },
    plugins: [
      new webpack.NoEmitOnErrorsPlugin(),
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
    ].concat(extraPlugins),
    node: {
      fs: 'empty',
      global: true,
      crypto: 'empty',
      tls: 'empty',
      net: 'empty',
      process: true,
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  };
}
