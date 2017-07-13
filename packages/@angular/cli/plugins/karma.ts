import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';
import * as webpack from 'webpack';
const webpackDevMiddleware = require('webpack-dev-middleware');

import { Pattern } from './glob-copy-webpack-plugin';
import { WebpackTestConfig, WebpackTestOptions } from '../models/webpack-test-config';
import { KarmaWebpackThrowError } from './karma-webpack-throw-error';

/**
 * Enumerate needed (but not require/imported) dependencies from this file
 *  to let the dependency validator know they are used.
 *
 * require('karma-source-map-support')
 */


const getAppFromConfig = require('../utilities/app-utils').getAppFromConfig;

let blocked: any[] = [];
let isBlocked = false;

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

const init: any = (config: any, emitter: any, customFileHandlers: any) => {
  const appConfig = getAppFromConfig(config.angularCli.app);
  const appRoot = path.join(config.basePath, appConfig.root);
  const testConfig: WebpackTestOptions = Object.assign({
    environment: 'dev',
    codeCoverage: false,
    sourcemaps: true,
    progress: true,
  }, config.angularCli);

  if (testConfig.sourcemaps) {
    // Add a reporter that fixes sourcemap urls.
    config.reporters.unshift('@angular/cli');

    // Code taken from https://github.com/tschaub/karma-source-map-support.
    // We can't use it directly because we need to add it conditionally in this file, and karma
    // frameworks cannot be added dynamically.
    const smsPath = path.dirname(require.resolve('source-map-support'));
    const ksmsPath = path.dirname(require.resolve('karma-source-map-support'));

    addKarmaFiles(config.files, [
      { pattern: path.join(smsPath, 'browser-source-map-support.js'), watched: false },
      { pattern: path.join(ksmsPath, 'client.js'), watched: false }
    ], true);
  }

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
    watchOptions: { poll: testConfig.poll },
    publicPath: '/_karma_webpack_/',
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

  // If Karma is being ran in single run mode, throw errors.
  if (config.singleRun) {
    webpackConfig.plugins.push(new KarmaWebpackThrowError());
  }

  // Use existing config if any.
  config.webpack = Object.assign(webpackConfig, config.webpack);
  config.webpackMiddleware = Object.assign(webpackMiddlewareConfig, config.webpackMiddleware);

  // Remove the @angular/cli test file if present, for backwards compatibility.
  const testFilePath = path.join(appRoot, appConfig.test);
  config.files.forEach((file: any, index: number) => {
    if (path.normalize(file.pattern) === testFilePath) {
      config.files.splice(index, 1);
    }
  });

  // When using code-coverage, auto-add coverage-istanbul.
  config.reporters = config.reporters || [];
  if (testConfig.codeCoverage && config.reporters.indexOf('coverage-istanbul') === -1) {
    config.reporters.push('coverage-istanbul');
  }

  // Our custom context and debug files list the webpack bundles directly instead of using
  // the karma files array.
  config.customContextFile = `${__dirname}/karma-context.html`;
  config.customDebugFile = `${__dirname}/karma-debug.html`;

  // Add the request blocker.
  config.beforeMiddleware = config.beforeMiddleware || [];
  config.beforeMiddleware.push('angularCliBlocker');

  // Delete global styles entry, we don't want to load them.
  delete webpackConfig.entry.styles;

  // The webpack tier owns the watch behavior so we want to force it in the config.
  webpackConfig.watch = true;
  // Files need to be served from a custom path for Karma.
  webpackConfig.output.path = '/_karma_webpack_/';
  webpackConfig.output.publicPath = '/_karma_webpack_/';

  let compiler: any;
  try {
    compiler = webpack(webpackConfig);
  } catch (e) {
    console.error(e.stack || e);
    if (e.details) {
      console.error(e.details);
    }
    throw e;
  }

  ['invalid', 'watch-run', 'run'].forEach(function (name) {
    compiler.plugin(name, function (_: any, callback: () => void) {
      isBlocked = true;

      if (typeof callback === 'function') {
        callback();
      }
    });
  });

  compiler.plugin('done', (stats: any) => {
    // Don't refresh karma when there are webpack errors.
    if (stats.compilation.errors.length === 0) {
      emitter.refreshFiles();
      isBlocked = false;
      blocked.forEach((cb) => cb());
      blocked = [];
    }
  });

  const middleware = new webpackDevMiddleware(compiler, webpackMiddlewareConfig);

  // Forward requests to webpack server.
  customFileHandlers.push({
    urlRegex: /^\/_karma_webpack_\/.*/,
    handler: function handler(req: any, res: any) {
      middleware(req, res, function () {
        // Ensure script and style bundles are served.
        // They are mentioned in the custom karma context page and we don't want them to 404.
        const alwaysServe = [
          '/_karma_webpack_/inline.bundle.js',
          '/_karma_webpack_/polyfills.bundle.js',
          '/_karma_webpack_/scripts.bundle.js',
          '/_karma_webpack_/vendor.bundle.js',
        ];
        if (alwaysServe.indexOf(req.url) != -1) {
          res.statusCode = 200;
          res.end();
        } else {
          res.statusCode = 404;
          res.end('Not found');
        }
      });
    }
  });

  emitter.on('exit', (done: any) => {
    middleware.close();
    done();
  });
};

init.$inject = ['config', 'emitter', 'customFileHandlers'];

// Dummy preprocessor, just to keep karma from showing a warning.
const preprocessor: any = () => (content: any, _file: string, done: any) => done(null, content);
preprocessor.$inject = [];

// Block requests until the Webpack compilation is done.
function requestBlocker() {
  return function (_request: any, _response: any, next: () => void) {
    if (isBlocked) {
      blocked.push(next);
    } else {
      next();
    }
  };
}

// Strip the server address and webpack scheme (webpack://) from error log.
const initSourcemapReporter: any = function (baseReporterDecorator: any) {
  baseReporterDecorator(this);
  const urlRegexp = /\(http:\/\/localhost:\d+\/_karma_webpack_\/webpack:\//gi;

  this.onSpecComplete = function (_browser: any, result: any) {
    if (!result.success && result.log.length > 0) {
      result.log.forEach((log: string, idx: number) => {
        result.log[idx] = log.replace(urlRegexp, '');
      });
    }
  };
};

initSourcemapReporter.$inject = ['baseReporterDecorator'];

module.exports = Object.assign({
  'framework:@angular/cli': ['factory', init],
  'preprocessor:@angular/cli': ['factory', preprocessor],
  'reporter:@angular/cli': ['type', initSourcemapReporter],
  'middleware:angularCliBlocker': ['factory', requestBlocker]
});
