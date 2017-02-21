import * as path from 'path';
import * as fs from 'fs';

import { CliConfig } from '../models/config';
import { Pattern } from './glob-copy-webpack-plugin';
import { extraEntryParser } from '../models/webpack-configs/utils';
import { WebpackTestConfig, WebpackTestOptions } from '../models/webpack-test-config';


function isDirectory(path: string) {
  try {
    return fs.statSync(path).isDirectory();
  } catch (_) {
    return false;
  }
}

const init: any = (config: any) => {
  const appConfig = CliConfig.fromProject().config.apps[0];
  const appRoot = path.join(config.basePath, appConfig.root);
  const testConfig: WebpackTestOptions = Object.assign({
    environment: 'dev',
    codeCoverage: false,
    sourcemap: true,
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
      config.files.push({
        pattern: filePattern,
        included: false,
        served: true,
        watched: true
      });

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
  const webpackConfig = new WebpackTestConfig(testConfig).buildConfig();
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
      .map(script => ({
        pattern: path.resolve(appRoot, script.input),
        included: true,
        served: true,
        watched: true
      }));

    // Unshift elements onto the beginning of the files array.
    // It's important to not replace the array, because
    // karma already has a reference to the existing array.
    config.files.unshift(...globalScriptPatterns);
  }

  // Add polyfills file before everything else
  if (appConfig.polyfills) {
    const polyfillsFile = path.resolve(appRoot, appConfig.polyfills);
    const polyfillsPattern = {
      pattern: polyfillsFile,
      included: true,
      served: true,
      watched: true
    };
    config.preprocessors[polyfillsFile] = ['webpack', 'sourcemap'];
    // Same as above.
    config.files.unshift(polyfillsPattern);
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
