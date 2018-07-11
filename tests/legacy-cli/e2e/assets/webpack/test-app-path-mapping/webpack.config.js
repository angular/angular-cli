/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const ngToolsWebpack = require('@ngtools/webpack');
const path = require('path');

const flags = require('./webpack.flags.json');

const preprocessLoader = 'preprocess-loader' + (flags.DEBUG ? '?+DEBUG' : '');


module.exports = {
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: './src/app/main.jit.ts',
  output: {
    path: path.resolve('./dist'),
    publicPath: 'dist/',
    filename: 'app.main.js'
  },
  plugins: [
    new ngToolsWebpack.AngularCompilerPlugin(require('./aotplugin.config.json'))
  ],
  module: {
    rules: [
      { test: /\.scss$/, loaders: ['raw-loader', 'sass-loader', preprocessLoader] },
      { test: /\.css$/, loader: 'raw-loader' },
      { test: /\.html$/, loaders: ['raw-loader', preprocessLoader] },
      // Use preprocess to remove DEBUG only code.
      // @ngtools/webpack must be the first (right most) loader.
      { test: /\.ts$/, use: [
        { loader: preprocessLoader },
        { loader: '@ngtools/webpack' }
      ] }
    ]
  },
  devServer: {
    historyApiFallback: true
  }
};
