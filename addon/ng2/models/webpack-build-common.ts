import * as path from 'path';
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
import * as webpack from 'webpack';
const atl = require('awesome-typescript-loader');

import { findLazyModules } from './find-lazy-modules';


import { BaseHrefWebpackPlugin } from '../utilities/base-href-webpack-plugin';


export function getWebpackCommonConfig(
  projectRoot: string,
  environment: string,
  appConfig: any,
  baseHref: string
) {

  const appRoot = path.resolve(projectRoot, appConfig.root);
  const appMain = path.resolve(appRoot, appConfig.main);
  const styles = appConfig.styles
               ? appConfig.styles.map((style: string) => path.resolve(appRoot, style))
               : [];
  const scripts = appConfig.scripts
                ? appConfig.scripts.map((script: string) => path.resolve(appRoot, script))
                : [];
  const lazyModules = findLazyModules(appRoot);

  let entry: { [key: string]: string[] } = {
    main: [appMain]
  };

  // Only add styles/scripts if there's actually entries there
  if (appConfig.styles.length > 0) { entry['styles'] = styles; }
  if (appConfig.scripts.length > 0) { entry['scripts'] = scripts; }

  return {
    devtool: 'source-map',
    resolve: {
      extensions: ['', '.ts', '.js'],
      root: appRoot
    },
    context: path.resolve(__dirname, './'),
    entry: entry,
    output: {
      path: path.resolve(projectRoot, appConfig.outDir),
      filename: '[name].bundle.js'
    },
    module: {
      preLoaders: [
        {
          test: /\.js$/,
          loader: 'source-map-loader',
          exclude: [
            /node_modules/
          ]
        }
      ],
      loaders: [
        {
          test: /\.ts$/,
          loaders: [
            {
              loader: 'awesome-typescript-loader',
              query: {
                useForkChecker: true,
                tsconfig: path.resolve(appRoot, appConfig.tsconfig)
              }
            }, {
              loader: 'angular2-template-loader'
            }
          ],
          exclude: [/\.(spec|e2e)\.ts$/]
        },

        // in main, load css as raw text
        {
          exclude: styles,
          test: /\.css/,
          loaders: ['raw-loader', 'postcss-loader']
        }, {
          exclude: styles,
          test: /\.styl$/,
          loaders: ['raw-loader', 'postcss-loader', 'stylus-loader'] },
        {
          exclude: styles,
          test: /\.less$/,
          loaders: ['raw-loader', 'postcss-loader', 'less-loader']
        }, {
          exclude: styles,
          test: /\.scss$|\.sass$/,
          loaders: ['raw-loader', 'postcss-loader', 'sass-loader']
        },

        // outside of main, load it via style-loader
        {
          include: styles,
          test: /\.css$/,
          loaders: ['style-loader', 'css-loader', 'postcss-loader']
        }, {
          include: styles,
          test: /\.styl$/,
          loaders: ['style-loader', 'css-loader', 'postcss-loader', 'stylus-loader']
        }, {
          include: styles,
          test: /\.less$/,
          loaders: ['style-loader', 'css-loader', 'postcss-loader', 'less-loader']
        }, {
          include: styles,
          test: /\.scss$|\.sass$/,
          loaders: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
        },

        // load global scripts using script-loader
        { include: scripts, test: /\.js$/, loader: 'script-loader' },

        { test: /\.json$/, loader: 'json-loader' },
        { test: /\.(jpg|png)$/, loader: 'url-loader?limit=10000' },
        { test: /\.html$/, loader: 'raw-loader' },

        { test: /\.(woff|ttf|svg)$/, loader: 'url?limit=10000' },
        { test: /\.woff2$/, loader: 'url?limit=10000&mimetype=font/woff2' },
        { test: /\.eot$/, loader: 'file' }
      ]
    },
    plugins: [
      new webpack.ContextReplacementPlugin(/.*/, appRoot, lazyModules),
      new atl.ForkCheckerPlugin(),
      new HtmlWebpackPlugin({
        template: path.resolve(appRoot, appConfig.index),
        chunksSortMode: 'dependency'
      }),
      new BaseHrefWebpackPlugin({
        baseHref: baseHref
      }),
      new webpack.NormalModuleReplacementPlugin(
        // This plugin is responsible for swapping the environment files.
        // Since it takes a RegExp as first parameter, we need to escape the path.
        // See https://webpack.github.io/docs/list-of-plugins.html#normalmodulereplacementplugin
        new RegExp(path.resolve(appRoot, appConfig.environments['source'])
          .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')),
        path.resolve(appRoot, appConfig.environments[environment])
      ),
      new webpack.optimize.CommonsChunkPlugin({
        // Optimizing ensures loading order in index.html
        name: ['styles', 'scripts', 'main'].reverse()
      }),
      new webpack.optimize.CommonsChunkPlugin({
        minChunks: Infinity,
        name: 'inline',
        filename: 'inline.js',
        sourceMapFilename: 'inline.map'
      }),
      new CopyWebpackPlugin([{
        context: path.resolve(appRoot, appConfig.assets),
        from: { glob: '**/*', dot: true },
        ignore: [ '.gitkeep' ],
        to: path.resolve(projectRoot, appConfig.outDir, appConfig.assets)
      }])
    ],
    node: {
      fs: 'empty',
      global: 'window',
      crypto: 'empty',
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  };
}
