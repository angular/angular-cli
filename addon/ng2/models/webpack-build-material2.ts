// Angular Material2 Custom CLI Webpack Plugin: This allows for the following:
// To build, serve, and watchmode the angular2-material repo.
//
// Requirements:
//
// Do a find and replace on the src directory
// .css'] => .scss']
// This allows for angular2-template-loader to transpile the sass correctly.
import * as webpack from 'webpack';
import {LoaderConfig} from '../utilities/ts-path-mappings-webpack-plugin';

const path = require('path');
const ForkCheckerPlugin = require('awesome-typescript-loader').ForkCheckerPlugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');


// var components = [
//     'button',
//     'card',
//     'checkbox',
//     'grid-list',
//     'icon',
//     'input',
//     'list',
//     'progress-bar',
//     'progress-circle',
//     'radio',
//     'sidenav',
//     'slide-toggle',
//     'button-toggle',
//     'tabs',
//     'toolbar'
// ];

export const getWebpackMaterialConfig = function(projectRoot: string) {
  const awesomeTypescriptLoaderConfig: LoaderConfig | any = {
    useWebpackText: true,
    useForkChecker: true,
    tsconfig: path.resolve(projectRoot, './src/demo-app/tsconfig.json')
  }
  /** Map relative paths to URLs. */
  // var aliasMap: any = {
  //     '@angular2-material/core': path.resolve(projectRoot, './src/core'),
  // };

  // components.forEach(function (name) {
  //   aliasMap[("@angular2-material/" + name)] = path.resolve(projectRoot, "./src/components/" + name);
  //   return aliasMap[("@angular2-material/" + name)] = path.resolve(projectRoot, "./src/components/" + name);
  // });

  return {
    devtool: 'inline-source-map',
    resolve: {
      extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js', '.css', '.scss'],
      plugins: [
      ]
      // alias: aliasMap
    },
    sassLoader: {
      includePaths: [
          // This allows for automatic resolving of @import's for sass for variables.
          path.resolve(projectRoot, './src/core/style')
      ]
    },
    context: path.resolve(__dirname, './'),
    entry: {
      main: [path.resolve(projectRoot, './src/demo-app/main.ts')],
      vendor: path.resolve(projectRoot, './src/demo-app/vendor.ts')
    },
    output: {
      path: './dist',
      filename: '[name].bundle.js'
    },
    module: {
      preLoaders: [
        {
          test: /\.js$/,
          loader: 'source-map-loader',
          exclude: [
            path.resolve(projectRoot, 'node_modules/rxjs'),
            path.resolve(projectRoot, 'node_modules/@angular'),
          ]
        }
      ],
      // ts: {
      //   configFileName: path.resolve(projectRoot, './src/demo-app/tsconfig.json')
      // },
      loaders: [
        {
          test: /\.ts$/,
          loaders: [
            {
              loader: 'awesome-typescript-loader',
              query: awesomeTypescriptLoaderConfig
            },
            {
              loader: 'angular2-template-loader'
            }
          ],
          exclude: [/\.(spec|e2e)\.ts$/]
        },
        { test: /\.json$/, loader: 'json-loader'},
        { test: /\.css$/,  loaders: ['raw-loader', 'postcss-loader'] },
        { test: /\.styl$/, loaders: ['raw-loader', 'postcss-loader', 'stylus-loader'] },
        { test: /\.less$/, loaders: ['raw-loader', 'less-loader'] },
        { test: /\.s?css$/, loaders: ['raw-loader', 'postcss-loader', 'sass-loader'] },
        { test: /\.(jpg|png)$/, loader: 'url-loader?limit=128000'},
        { test: /\.html$/, loader: 'raw-loader' }
      ]
    },
    plugins: [
      new webpack.optimize.CommonsChunkPlugin({name: 'vendor'}),
      new ForkCheckerPlugin(),
      new HtmlWebpackPlugin({
        template: path.resolve(projectRoot, './src/demo-app/index.html'),
        chunksSortMode: 'dependency'
      }),
    ],
    node: {
      global: 'window',
      crypto: 'empty',
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  };
}

export const getWebpackMaterialE2EConfig = function(projectRoot: string) {
  const awesomeTypescriptLoaderConfig: LoaderConfig | any = {
    useWebpackText: true,
    useForkChecker: true,
    tsconfig: path.resolve(projectRoot, './src/e2e-app/tsconfig.json')
  }
  /** Map relative paths to URLs. */
  // var aliasMap: any = {
  //     '@angular2-material/core': path.resolve(projectRoot, './src/core'),
  // };

  // components.forEach(function (name) {
  //   aliasMap[("@angular2-material/" + name)] = path.resolve(projectRoot, "./src/components/" + name);
  //   return aliasMap[("@angular2-material/" + name)] = path.resolve(projectRoot, "./src/components/" + name);
  // });

  return {
    devtool: 'inline-source-map',
    resolve: {
      extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js', '.css', '.scss'],

      plugins: [
      ]
      // alias: aliasMap
    },
    sassLoader: {
      includePaths: [
          // This allows for automatic resolving of @import's for sass for variables.
          path.resolve(projectRoot, './src/core/style')
      ]
    },
    debug: true,
    context: path.resolve(__dirname, './'),
    entry: {
      main: [path.resolve(projectRoot, './src/e2e-app/main.ts')],
      vendor: path.resolve(projectRoot, './src/e2e-app/vendor.ts')
    },
    output: {
      path: './dist',
      filename: '[name].bundle.js'
    },
    module: {
      preLoaders: [
        {
          test: /\.js$/,
          loader: 'source-map-loader',
          exclude: [
            path.resolve(projectRoot, 'node_modules/rxjs'),
            path.resolve(projectRoot, 'node_modules/@angular'),
          ]
        }
      ],
      // ts: {
      //   configFileName: path.resolve(projectRoot, './src/e2e-app/tsconfig.json')
      // },
      loaders: [
        {
          test: /\.ts$/,
          loaders: [
            {
              loader: 'awesome-typescript-loader',
              query: awesomeTypescriptLoaderConfig
            },
            {
              loader: 'angular2-template-loader'
            }
          ],
          exclude: [/\.(spec|e2e)\.ts$/]
        },
        { test: /\.json$/, loader: 'json-loader'},
        { test: /\.css$/,  loaders: ['raw-loader', 'postcss-loader'] },
        { test: /\.styl$/, loaders: ['raw-loader', 'postcss-loader', 'stylus-loader'] },
        { test: /\.less$/, loaders: ['raw-loader', 'less-loader'] },
        { test: /\.s?css$/, loaders: ['raw-loader', 'postcss-loader', 'sass-loader'] },
        { test: /\.(jpg|png)$/, loader: 'url-loader?limit=128000'},
        { test: /\.html$/, loader: 'raw-loader' }
      ]
    },
    plugins: [
      new webpack.optimize.CommonsChunkPlugin({name: 'vendor'}),
      new ForkCheckerPlugin(),
      new HtmlWebpackPlugin({
        template: path.resolve(projectRoot, './src/e2e-app/index.html'),
        chunksSortMode: 'dependency'
      }),
    ],
    node: {
      global: 'window',
      crypto: 'empty',
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  };
}
