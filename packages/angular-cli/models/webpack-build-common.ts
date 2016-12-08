import * as webpack from 'webpack';
import * as path from 'path';
import {GlobCopyWebpackPlugin} from '../plugins/glob-copy-webpack-plugin';
import {packageChunkSort} from '../utilities/package-chunk-sort';
import {BaseHrefWebpackPlugin} from '@angular-cli/base-href-webpack';

const ProgressPlugin  = require('webpack/lib/ProgressPlugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const autoprefixer = require('autoprefixer');


export function getWebpackCommonConfig(
  projectRoot: string,
  environment: string,
  appConfig: any,
  baseHref: string,
  sourcemap: boolean,
  vendorChunk: boolean,
  verbose: boolean,
  progress: boolean
) {

  const appRoot = path.resolve(projectRoot, appConfig.root);
  const appMain = path.resolve(appRoot, appConfig.main);
  const nodeModules = path.resolve(projectRoot, 'node_modules');
  const styles = appConfig.styles
               ? appConfig.styles.map((style: string) => path.resolve(appRoot, style))
               : [];
  const scripts = appConfig.scripts
                ? appConfig.scripts.map((script: string) => path.resolve(appRoot, script))
                : [];
  const extraPlugins: any[] = [];

  let entry: { [key: string]: string[] } = {
    main: [appMain]
  };

  // Only add styles/scripts if there's actually entries there
  if (appConfig.styles.length > 0) { entry['styles'] = styles; }
  if (appConfig.scripts.length > 0) { entry['scripts'] = scripts; }

  if (vendorChunk) {
    extraPlugins.push(new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      chunks: ['main'],
      minChunks: (module: any) => module.userRequest && module.userRequest.startsWith(nodeModules)
    }));
  }

  if (progress) {
    extraPlugins.push(new ProgressPlugin({
      profile: verbose,
      colors: true
    }));
  }

  return {
    devtool: sourcemap ? 'source-map' : false,
    resolve: {
      extensions: ['.ts', '.js'],
      modules: [nodeModules],
    },
    resolveLoader: {
      modules: [path.resolve(projectRoot, 'node_modules')]
    },
    context: projectRoot,
    entry: entry,
    output: {
      path: path.resolve(projectRoot, appConfig.outDir),
      filename: '[name].bundle.js',
      sourceMapFilename: '[name].bundle.map',
      chunkFilename: '[id].chunk.js'
    },
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.js$/,
          loader: 'source-map-loader',
          exclude: [ nodeModules ]
        },
        // in main, load css as raw text
        {
          exclude: styles,
          test: /\.css$/,
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


        // load global scripts using script-loader
        { include: scripts, test: /\.js$/, loader: 'script-loader' },

        { test: /\.json$/, loader: 'json-loader' },
        { test: /\.(jpg|png|gif)$/, loader: 'url-loader?limit=10000' },
        { test: /\.html$/, loader: 'raw-loader' },

        { test: /\.(otf|ttf|woff|woff2)$/, loader: 'url-loader?limit=10000' },
        { test: /\.(eot|svg)$/, loader: 'file-loader' }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(appRoot, appConfig.index),
        filename: path.resolve(appConfig.outDir, appConfig.index),
        chunksSortMode: packageChunkSort(['inline', 'styles', 'scripts', 'vendor', 'main'])
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
        minChunks: Infinity,
        name: 'inline'
      }),
      new GlobCopyWebpackPlugin({
        patterns: appConfig.assets,
        globOptions: {cwd: appRoot, dot: true, ignore: '**/.gitkeep'}
      }),
      new webpack.LoaderOptionsPlugin({
        test: /\.(css|scss|sass|less|styl)$/,
        options: {
          postcss: [ autoprefixer() ]
        },
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
