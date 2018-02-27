const ngToolsWebpack = require('@ngtools/webpack');
const path = require('path');

const flags = require('./webpack.flags.json');

const preprocessLoader = 'preprocess-loader' + (flags.DEBUG ? '?+DEBUG' : '');


module.exports = {
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: './not/so/source/app/main.jit.ts',
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
