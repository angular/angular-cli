var webpack = require('webpack');
var path = require('path');
var clone = require('js.clone');

var UglifyJsPlugin = require('webpack/lib/optimize/UglifyJsPlugin');
var DedupePlugin = require('webpack/lib/optimize/DedupePlugin');
var ContextReplacementPlugin = require('webpack/lib/ContextReplacementPlugin');
var TsConfigPathsPlugin = require('awesome-typescript-loader').TsConfigPathsPlugin;
var ForkCheckerPlugin = require('awesome-typescript-loader').ForkCheckerPlugin;

var sharedPlugins = [
 
  new ContextReplacementPlugin(
    // The (\\|\/) piece accounts for path separators in *nix and Windows
    /angular(\\|\/)core(\\|\/)(esm(\\|\/)src|src)(\\|\/)linker/,
    root('./src')
  ),
  new TsConfigPathsPlugin({
    tsconfig: 'tsconfig.json'
  }),
  new ForkCheckerPlugin()
];
var webpackConfig = setTypeScriptAlias(require('./tsconfig.json'), {
  cache: true,

  devtool: 'source-map',

  output: {
    filename: '[name]-bundle.js',
    path: './dist',
  },

  module: {
    preLoaders: [
      // fix angular2
      {
        test: /(systemjs_component_resolver|system_js_ng_module_factory_loader)\.js$/,
        loader: 'string-replace-loader',
        query: {
          search: '(lang_1(.*[\\n\\r]\\s*\\.|\\.))?(global(.*[\\n\\r]\\s*\\.|\\.))?(System|SystemJS)(.*[\\n\\r]\\s*\\.|\\.)import',
          replace: 'System.import',
          flags: 'g'
        }
      },
      {
        test: /.js$/,
        loader: 'string-replace-loader',
        query: {
          search: 'moduleId: module.id,',
          replace: '',
          flags: 'g'
        }
      }
      // end angular2 fix
    ],
    loaders: [
      // .ts files for TypeScript
      { test: /\.(ts)$/, loaders: ['awesome-typescript-loader', 'angular2-template-loader'], exclude: [/node_modules/] },
      { test: /\.json$/, loader: 'json-loader' },
      { test: /\.html$/, loader: 'raw-loader' },
      { test: /\.css$/, loader: 'raw-loader' }
    ]
  },

  plugins: [
    // don't define plugins here. define them above in shared plugins
  ],

  resolve: {
    extensions: ['', '.ts', '.js', '.json'],
  },

})

module.exports = [
  plugins(sharedPlugins, require('./webpack.config-browser')(clone(webpackConfig))),
  plugins(sharedPlugins, require('./webpack.config-server')(clone(webpackConfig))),
]


function plugins(plugins, config) {
  config.plugins = config.plugins.concat(plugins);
  return config
}


function setTypeScriptAlias(tsConfig, config) {
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
