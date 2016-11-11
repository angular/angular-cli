const path = require('path');
const getWebpackTestConfig = require('../models/webpack-build-test').getWebpackTestConfig;
const CliConfig = require('../models/config').CliConfig;

const init = (config) => {
  // load Angular CLI config
  if (!config.angularCli || !config.angularCli.config) {
    throw new Error('Missing \'angularCli.config\' entry in Karma config');
  }
  const angularCliConfig = require(path.join(config.basePath, config.angularCli.config));
  const appConfig = angularCliConfig.apps[0];
  const environment = config.angularCli.environment || 'dev';
  const testConfig = {
    codeCoverage: config.angularCli.codeCoverage || false,
    lint: config.angularCli.lint || false,
    sourcemap: config.angularCli.sourcemap
  }

  // add webpack config
  const webpackConfig = getWebpackTestConfig(config.basePath, environment, appConfig, testConfig);
  const webpackMiddlewareConfig = {
    noInfo: true, // Hide webpack output because its noisy.
    stats: { // Also prevent chunk and module display output, cleaner look. Only emit errors.
      assets: false,
      colors: true,
      version: false,
      hash: false,
      timings: false,
      chunks: false,
      chunkModules: false
    },
    watchOptions: {
      poll: CliConfig.fromProject().config.defaults.poll
    }
  };

  config.webpack = Object.assign(webpackConfig, config.webpack);
  config.webpackMiddleware = Object.assign(webpackMiddlewareConfig, config.webpackMiddleware);

  // replace the angular-cli preprocessor with webpack+sourcemap
  Object.keys(config.preprocessors)
    .filter((file) => config.preprocessors[file].indexOf('angular-cli') !== -1)
    .map((file) => config.preprocessors[file])
    .map((arr) => arr.splice(arr.indexOf('angular-cli'), 1, 'webpack', 'sourcemap'));
}

init.$inject = ['config'];

// dummy preprocessor, just to keep karma from showing a warning
const preprocessor = () => (content, file, done) => done(null, content);
preprocessor.$inject = [];

// also export karma-webpack and karma-sourcemap-loader
module.exports = Object.assign({
  'framework:angular-cli': ['factory', init],
  'preprocessor:angular-cli': ['factory', preprocessor]
}, require('karma-webpack'), require('karma-sourcemap-loader'));
