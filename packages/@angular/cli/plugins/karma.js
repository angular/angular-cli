const path = require('path');
const fs = require('fs');

const getTestConfig = require('../models/webpack-configs/test').getTestConfig;

function isDirectory(path) {
  try {
    return fs.statSync(path).isDirectory();
  } catch (_) {
    return false;
  }
}

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

  // Add assets. This logic is mimics the one present in GlobCopyWebpackPlugin.
  if (appConfig.assets) {
    config.proxies = config.proxies || {};
    appConfig.assets.forEach(pattern => {
      // Convert all string patterns to Pattern type.
      pattern = typeof pattern === 'string' ? { glob: pattern } : pattern;
      // Add defaults.
      // Input is always resolved relative to the appRoot.
      pattern.input = path.resolve(appRoot, pattern.input || '');
      pattern.output = pattern.output || '';
      pattern.glob = pattern.glob || '';

      // Build karma file pattern.
      const assetPath = path.join(pattern.input, pattern.glob);
      const filePattern = isDirectory(assetPath) ? assetPath + '/**' : assetPath;
      config.files.push({
        pattern: filePattern,
        included: false,
        served: true,
        watched: true
      });

      // The `files` entry serves the file from `/base/{asset.input}/{asset.glob}`.
      // We need to add a URL rewrite that exposes the asset as `/{asset.output}/{asset.glob}`.
      let relativePath, proxyPath;
      if (fs.existsSync(assetPath)) {
        relativePath = path.relative(config.basePath, assetPath);
        proxyPath = path.join(pattern.output, pattern.glob);
      } else {
        // For globs (paths that don't exist), proxy pattern.output to pattern.input.
        relativePath = path.relative(config.basePath, pattern.input);
        proxyPath = path.join(pattern.output);

      }
      // Proxy paths must have only forward slashes.
      proxyPath = proxyPath.replace(/\\/g, '/');
      config.proxies['/' + proxyPath] = '/base/' + relativePath;
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
      poll: config.angularCli.poll
    }
  };

  config.webpack = Object.assign(webpackConfig, config.webpack);
  config.webpackMiddleware = Object.assign(webpackMiddlewareConfig, config.webpackMiddleware);

  // replace the @angular/cli preprocessor with webpack+sourcemap
  Object.keys(config.preprocessors)
    .filter((file) => config.preprocessors[file].indexOf('@angular/cli') !== -1)
    .map((file) => config.preprocessors[file])
    .map((arr) => arr.splice(arr.indexOf('@angular/cli'), 1, 'webpack', 'sourcemap'));

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

  // Add polyfills file before everything else
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
