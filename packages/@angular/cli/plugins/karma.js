const path = require('path');
const fs = require('fs');

const getTestConfig = require('../models/webpack-configs/test').getTestConfig;
const CliConfig = require('../models/config').CliConfig;

const init = (config) => {
  // load Angular CLI config
  if (!config.angularCli || !config.angularCli.config) {
    throw new Error('Missing \'angularCli.config\' entry in Karma config');
  }
  const angularCliConfig = require(path.join(config.basePath, config.angularCli.config));
  const appConfig = angularCliConfig.apps[0];
  const appRoot = path.join(config.basePath, appConfig.root);
  const environment = config.angularCli.environment || 'dev';
  const testConfig = {
    codeCoverage: config.angularCli.codeCoverage || false,
    sourcemap: config.angularCli.sourcemap,
    progress: config.angularCli.progress
  }

  // add assets
  if (appConfig.assets) {
    const assets = typeof appConfig.assets === 'string' ? [appConfig.assets] : appConfig.assets;
    config.proxies = config.proxies || {};
    assets.forEach(asset => {
      const fullAssetPath = path.join(config.basePath, appConfig.root, asset);
      const isDirectory = fs.lstatSync(fullAssetPath).isDirectory();
      const filePattern = isDirectory ? fullAssetPath + '/**' : fullAssetPath;
      const proxyPath = isDirectory ? asset + '/' : asset;
      config.files.push({
        pattern: filePattern,
        included: false,
        served: true,
        watched: true
      });
      // The `files` entry serves the file from `/base/{appConfig.root}/{asset}`
      //  so, we need to add a URL rewrite that exposes the asset as `/{asset}` only
      config.proxies['/' + proxyPath] = '/base/' + appConfig.root + '/' + proxyPath;
    });
  }

  // add webpack config
  const webpackConfig = getTestConfig(config.basePath, environment, appConfig, testConfig);
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

  // replace the @angular/cli preprocessor with webpack+sourcemap
  Object.keys(config.preprocessors)
    .filter((file) => config.preprocessors[file].indexOf('@angular/cli') !== -1)
    .map((file) => config.preprocessors[file])
    .map((arr) => arr.splice(arr.indexOf('@angular/cli'), 1, 'webpack', 'sourcemap'));

  // Add polyfills file
  if (appConfig.polyfills) {
    const polyfillsFile = path.resolve(appRoot, appConfig.polyfills);
    const polyfillsPattern = {
      pattern: polyfillsFile,
      included: true,
      served: true,
      watched: true
    }
    Array.prototype.unshift.apply(config.files, [polyfillsPattern]);
    config.preprocessors[polyfillsFile] = ['webpack', 'sourcemap'];
  }

  // Add global scripts
  if (appConfig.scripts && appConfig.scripts.length > 0) {
    const globalScriptPatterns = appConfig.scripts
      .map(script => typeof script === 'string' ? { input: script } : script)
      // Neither renamed nor lazy scripts are currently supported
      .filter(script => !(script.output || script.lazy))
      .map(script => ({
        pattern: path.resolve(appRoot, script.input),
        included: true,
        served: true,
        watched: true
      }));

    // Unshift elements onto the beginning of the files array.
    // It's important to not replace the array, because
    // karma already has a reference to the existing array.
    Array.prototype.unshift.apply(config.files, globalScriptPatterns);
  }
}

init.$inject = ['config'];

// dummy preprocessor, just to keep karma from showing a warning
const preprocessor = () => (content, file, done) => done(null, content);
preprocessor.$inject = [];

// also export karma-webpack and karma-sourcemap-loader
module.exports = Object.assign({
  'framework:@angular/cli': ['factory', init],
  'preprocessor:@angular/cli': ['factory', preprocessor]
}, require('karma-webpack'), require('karma-sourcemap-loader'));
