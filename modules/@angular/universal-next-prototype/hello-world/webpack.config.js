var webpack = require('webpack');
var clone = require('js.clone');

var webpackConfig = {
  cache: false,

  devtool: 'source-map',

  output: {
    path: './dist',
  },

  module: {
    loaders: [
      // .ts files for TypeScript
      { test: /\.ts$/, loader: 'ts-loader' }
    ]
  },

  plugins: [
  ],

  resolve: {

    extensions: ['', '.ts', '.js'],

  },

}


module.exports = [
  require('./webpack.config-browser')(clone(webpackConfig)),
  require('./webpack.config-server')(clone(webpackConfig)),
]
