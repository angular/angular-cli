import * as webpack from 'webpack';

const path = require('path');

export const getWebpackTestConfig = function(projectRoot: string) {
  return {
    devtool: 'inline-source-map',
    context: path.resolve(__dirname, './'),
    resolve: {
      extensions: ['', '.ts', '.js'],
      root: path.resolve(projectRoot, './src')
    },
    entry: {
      test: path.resolve(projectRoot, './src/test.ts')
    },
    output: {
      path: './dist.test',
      filename: '[name].bundle.js'
    },
    module: {
      preLoaders: [
        {
          test: /\.ts$/,
          loader: 'tslint-loader',
          exclude: [
            path.resolve(projectRoot, 'node_modules')
          ]
        },
        {
          test: /\.js$/,
          loader: 'source-map-loader',
          exclude: [
            path.resolve(projectRoot, 'node_modules/rxjs'),
            path.resolve(projectRoot, 'node_modules/@angular')
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
                useWebpackText: true,
                tsconfig: path.resolve(projectRoot, './src/tsconfig.json'),
                // resolveGlobs: false,
                module: "commonjs",
                target: "es5",
                useForkChecker: true,
                removeComments: true
              }
            },
            {
              loader: 'angular2-template-loader'
            }
          ],
          exclude: [/\.e2e\.ts$/]
        },
        { test: /\.json$/, loader: 'json-loader'},
        { test: /\.css$/,  loaders: ['raw-loader', 'postcss-loader'] },
        { test: /\.styl$/, loaders: ['raw-loader', 'postcss-loader', 'stylus-loader'] },
        { test: /\.less$/, loaders: ['raw-loader', 'postcss-loader', 'less-loader'] },
        { test: /\.scss$/, loaders: ['raw-loader', 'postcss-loader', 'sass-loader'] },
        { test: /\.(jpg|png)$/, loader: 'url-loader?limit=128000'},
        { test: /\.html$/, loader: 'raw-loader', exclude: [path.resolve(projectRoot, 'src/index.html')] }
      ],
      postLoaders: [
        {
          test: /\.(js|ts)$/, loader: 'istanbul-instrumenter-loader',
          exclude: [
            /\.(e2e|spec)\.ts$/,
            /node_modules/
          ]
        }
      ]
    },
    tslint: {
      emitErrors: false,
      failOnHint: false,
      resourcePath: 'src'
    },
    node: {
      global: 'window',
      process: false,
      crypto: 'empty',
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  };
}
