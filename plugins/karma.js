const path = require('path');
const getWebpackTestConfig = require('../addon/ng2/models/webpack-build-test').getWebpackTestConfig;

const init = (config) => {

  // load Angular CLI config
  if (!config.angularCliConfig) throw new Error('Missing \'angularCliConfig\' entry in Karma config');
  const angularCliConfig = require(path.join(config.basePath, config.angularCliConfig))

  // add webpack config
  config.webpack = getWebpackTestConfig(config.basePath, angularCliConfig.defaults.sourceDir);
  config.webpackMiddleware = {
    noInfo: true, // Hide webpack output because its noisy.
    stats: { // Also prevent chunk and module display output, cleaner look. Only emit errors.
      assets: false,
      colors: true,
      version: false,
      hash: false,
      timings: false,
      chunks: false,
      chunkModules: false
    }
  };

  // replace the angular-cli preprocessor with webpack+sourcemap
  Object.keys(config.preprocessors)
    .filter((file) => config.preprocessors[file].indexOf('angular-cli') !== -1)
    .map((file) => config.preprocessors[file])
    .map((arr) => arr.splice(arr.indexOf('angular-cli'), 1, 'webpack', 'sourcemap'));
}

init.$inject = ['config']

// dummy preprocessor, just to keep karma from showing a warning
const preprocessor = () => (content, file, done) => done(null, content);
preprocessor.$inject = []

// also export karma-webpack and karma-sourcemap-loader
module.exports = Object.assign({
  'framework:angular-cli': ['factory', init],
  'preprocessor:angular-cli': ['factory', preprocessor]
}, require('karma-webpack'), require('karma-sourcemap-loader'));