var webpack = require('webpack');
var path = require('path');
var clone = require('js.clone');

var tsConfig = require('./tsconfig.json');

var webpackConfig = setTypeScriptAlias({
  cache: false,

  devtool: 'source-map',

  output: {
    path: './dist',
  },

  module: {
    loaders: [
      // .ts files for TypeScript
      { test: /\.ts$/, loader: 'ts-loader' },
      { test: /\.json$/, loader: 'json-loader' }
    ]
  },

  plugins: [
  ],

  resolve: {

    extensions: ['', '.ts', '.js', '.json']

  },

})


module.exports = [
  require('./webpack.config-browser')(clone(webpackConfig)),
  require('./webpack.config-server')(clone(webpackConfig)),
]


function setTypeScriptAlias(config) {
  var newConfig = clone(config);
  newConfig = newConfig || {};
  newConfig.resolve = newConfig.resolve || {};
  newConfig.resolve.alias = newConfig.resolve.alias || {};
  var tsPaths = tsConfig.compilerOptions.paths;
  for (var prop in tsPaths) {
    newConfig.resolve.alias[prop]  = root(tsPaths[prop][0]);
  }
  return newConfig;
}

function root(args) {
  args = Array.prototype.slice.call(arguments, 0);
  return path.join.apply(path, [__dirname].concat(args));
}
