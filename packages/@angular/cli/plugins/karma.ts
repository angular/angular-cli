import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';

import { Pattern } from './glob-copy-webpack-plugin';
import { extraEntryParser } from '../models/webpack-configs/utils';
import { WebpackTestConfig, WebpackTestOptions } from '../models/webpack-test-config';
import { KarmaWebpackThrowError } from './karma-webpack-throw-error';

const getAppFromConfig = require('../utilities/app-utils').getAppFromConfig;

function isDirectory(path: string) {
  try {
    return fs.statSync(path).isDirectory();
  } catch (_) {
    return false;
  }
}

// Add files to the Karma files array.
function addKarmaFiles(files: any[], newFiles: any[], prepend = false) {
  const defaults = {
    included: true,
    served: true,
    watched: true
  };

  const processedFiles = newFiles
    // Remove globs that do not match any files, otherwise Karma will show a warning for these.
    .filter(file => glob.sync(file.pattern, { nodir: true }).length != 0)
    // Fill in pattern properties with defaults.
    .map(file => ({ ...defaults, ...file }));

  // It's important to not replace the array, because
  // karma already has a reference to the existing array.
  if (prepend) {
    files.unshift(...processedFiles);
  } else {
    files.push(...processedFiles);
  }
}

const init: any = (config: any) => {
  const appConfig = getAppFromConfig(config.angularCli.app);
  const appRoot = path.join(config.basePath, appConfig.root);
  const testConfig: WebpackTestOptions = Object.assign({
    environment: 'dev',
    codeCoverage: false,
    sourcemaps: true,
    progress: true,
  }, config.angularCli);

  // Add assets. This logic is mimics the one present in GlobCopyWebpackPlugin.
  if (appConfig.assets) {
    config.proxies = config.proxies || {};
    appConfig.assets.forEach((pattern: Pattern) => {
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
      addKarmaFiles(config.files, [{ pattern: filePattern, included: false }]);

      // The `files` entry serves the file from `/base/{asset.input}/{asset.glob}`.
      // We need to add a URL rewrite that exposes the asset as `/{asset.output}/{asset.glob}`.
      let relativePath: string, proxyPath: string;
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

  // Add webpack config.
  const webpackConfig = new WebpackTestConfig(testConfig, appConfig).buildConfig();
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
      poll: testConfig.poll
    }
  };

  // If Karma is being ran in single run mode, throw errors.
  if (config.singleRun) {
    webpackConfig.plugins.push(new KarmaWebpackThrowError());
  }

  config.webpack = Object.assign(webpackConfig, config.webpack);
  config.webpackMiddleware = Object.assign(webpackMiddlewareConfig, config.webpackMiddleware);

  // Replace the @angular/cli preprocessor with webpack+sourcemap.
  Object.keys(config.preprocessors)
    .filter((file) => config.preprocessors[file].indexOf('@angular/cli') !== -1)
    .map((file) => config.preprocessors[file])
    .map((arr) => arr.splice(arr.indexOf('@angular/cli'), 1, 'webpack', 'sourcemap'));

  // Add global scripts. This logic mimics the one in webpack-configs/common.
  if (appConfig.scripts && appConfig.scripts.length > 0) {
    const globalScriptPatterns = extraEntryParser(appConfig.scripts, appRoot, 'scripts')
      // Neither renamed nor lazy scripts are currently supported
      .filter(script => !(script.output || script.lazy))
      .map(script => ({ pattern: path.resolve(appRoot, script.input) }));
    addKarmaFiles(config.files, globalScriptPatterns, true);
  }

  // Add polyfills file before everything else
  if (appConfig.polyfills) {
    const polyfillsFile = path.resolve(appRoot, appConfig.polyfills);
    config.preprocessors[polyfillsFile] = ['webpack', 'sourcemap'];
    addKarmaFiles(config.files, [{ pattern: polyfillsFile }], true);
  }
};

init.$inject = ['config'];

// Dummy preprocessor, just to keep karma from showing a warning.
const preprocessor: any = () => (content: any, _file: string, done: any) => done(null, content);
preprocessor.$inject = [];

// Also export karma-webpack and karma-sourcemap-loader.
module.exports = Object.assign({
  'framework:@angular/cli': ['factory', init],
  'preprocessor:@angular/cli': ['factory', preprocessor]
}, require('karma-webpack'), require('karma-sourcemap-loader'));
