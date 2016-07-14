import * as webpack from 'webpack';

const path = require('path');
const webpackMerge = require('webpack-merge'); // used to merge webpack configs
const WebpackMd5Hash = require('webpack-md5-hash');
const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin'); //TODO WP2 Typings
const CompressionPlugin = require("compression-webpack-plugin");

export const getWebpackProdConfigPartial = function(projectRoot: string) {
  return {
    debug: false,
    devtool: 'source-map',
    output: {
      path: path.resolve(projectRoot, './dist'),
      filename: '[name].[chunkhash].bundle.js',
      sourceMapFilename: '[name].[chunkhash].bundle.map',
      chunkFilename: '[id].[chunkhash].chunk.js'
    },
    plugins: [
      new WebpackMd5Hash(),
      new webpack.optimize.DedupePlugin()
      // ~400kb (Doesn't do anything different (yet?))
      // new LoaderOptionsPlugin({
      //   test: /\.js/,
      //   minimize: true,
      //   optimize: true,
      //   debug: false
      // }),
      // ~107kb
      new webpack.optimize.UglifyJsPlugin({
        beautify: false, //prod
        mangle: { screw_ie8 : true }, //prod
        compress: { screw_ie8: true }, //prod
        comments: false //prod
      }),
      new CompressionPlugin({
          asset: "[path].gz[query]",
          algorithm: "gzip",
          test: /\.js$|\.html$/,
          threshold: 10240,
          minRatio: 0.8
      })
    ],
    tslint: {
      emitErrors: true,
      failOnHint: true,
      resourcePath: path.resolve(projectRoot, './src')
    },
    htmlLoader: {
      minimize: true,
      removeAttributeQuotes: false,
      caseSensitive: true,
      customAttrSurround: [
        [/#/, /(?:)/],
        [/\*/, /(?:)/],
        [/\[?\(?/, /(?:)/]
      ],
      customAttrAssign: [/\)?\]?=/]
    },
    node: {
      global: 'window',
      crypto: 'empty',
      process: false,
      module: false,
      clearImmediate: false,
      setImmediate: false
    }
  }
};
