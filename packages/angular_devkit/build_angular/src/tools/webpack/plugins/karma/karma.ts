/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable */
// TODO: cleanup this file, it's copied as is from Angular CLI.
import * as http from 'node:http';
import * as path from 'node:path';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';

import { statsErrorsToString } from '../../utils/stats';
import { createConsoleLogger } from '@angular-devkit/core/node';
import { logging } from '@angular-devkit/core';
import { BuildOptions } from '../../../../utils/build-options';
import { normalizeSourceMaps } from '../../../../utils/index';

const KARMA_APPLICATION_PATH = '_karma_webpack_';

let blocked: any[] = [];
let isBlocked = false;
let webpackMiddleware: any;
let successCb: () => void;
let failureCb: () => void;

const init: any = (config: any, emitter: any) => {
  if (!config.buildWebpack) {
    throw new Error(
      `The '@angular-devkit/build-angular/plugins/karma' karma plugin is meant to` +
        ` be used from within Angular CLI and will not work correctly outside of it.`,
    );
  }
  const options = config.buildWebpack.options as BuildOptions;
  const logger: logging.Logger = config.buildWebpack.logger || createConsoleLogger();
  successCb = config.buildWebpack.successCb;
  failureCb = config.buildWebpack.failureCb;

  // Add a reporter that fixes sourcemap urls.
  if (normalizeSourceMaps(options.sourceMap).scripts) {
    config.reporters.unshift('@angular-devkit/build-angular--sourcemap-reporter');

    // Code taken from https://github.com/tschaub/karma-source-map-support.
    // We can't use it directly because we need to add it conditionally in this file, and karma
    // frameworks cannot be added dynamically.
    const smsPath = path.dirname(require.resolve('source-map-support'));
    const ksmsPath = path.dirname(require.resolve('karma-source-map-support'));

    config.files.unshift(
      {
        pattern: path.join(smsPath, 'browser-source-map-support.js'),
        included: true,
        served: true,
        watched: false,
      },
      { pattern: path.join(ksmsPath, 'client.js'), included: true, served: true, watched: false },
    );
  }

  config.reporters.unshift('@angular-devkit/build-angular--event-reporter');

  // When using code-coverage, auto-add karma-coverage.
  if (
    options.codeCoverage &&
    !config.reporters.some((r: string) => r === 'coverage' || r === 'coverage-istanbul')
  ) {
    config.reporters.push('coverage');
  }

  // Add webpack config.
  const webpackConfig = config.buildWebpack.webpackConfig;
  const webpackMiddlewareConfig = {
    // Hide webpack output because its noisy.
    stats: false,
    publicPath: `/${KARMA_APPLICATION_PATH}/`,
  };

  // Use existing config if any.
  config.webpack = { ...webpackConfig, ...config.webpack };
  config.webpackMiddleware = { ...webpackMiddlewareConfig, ...config.webpackMiddleware };

  // Our custom context and debug files list the webpack bundles directly instead of using
  // the karma files array.
  config.customContextFile = `${__dirname}/karma-context.html`;
  config.customDebugFile = `${__dirname}/karma-debug.html`;

  // Add the request blocker and the webpack server fallback.
  config.beforeMiddleware = config.beforeMiddleware || [];
  config.beforeMiddleware.push('@angular-devkit/build-angular--blocker');
  config.middleware = config.middleware || [];
  config.middleware.push('@angular-devkit/build-angular--fallback');

  if (config.singleRun) {
    // There's no option to turn off file watching in webpack-dev-server, but
    // we can override the file watcher instead.
    webpackConfig.plugins.unshift({
      apply: (compiler: any) => {
        compiler.hooks.afterEnvironment.tap('karma', () => {
          compiler.watchFileSystem = { watch: () => {} };
        });
      },
    });
  }
  // Files need to be served from a custom path for Karma.
  webpackConfig.output.path = `/${KARMA_APPLICATION_PATH}/`;
  webpackConfig.output.publicPath = `/${KARMA_APPLICATION_PATH}/`;

  const compiler = webpack(webpackConfig, (error, stats) => {
    if (error) {
      throw error;
    }

    if (stats?.hasErrors()) {
      // Only generate needed JSON stats and when needed.
      const statsJson = stats?.toJson({
        all: false,
        children: true,
        errors: true,
        warnings: true,
      });

      logger.error(statsErrorsToString(statsJson, { colors: true }));

      if (config.singleRun) {
        // Notify potential listeners of the compile error.
        emitter.emit('load_error');
      }

      // Finish Karma run early in case of compilation error.
      emitter.emit('run_complete', [], { exitCode: 1 });

      // Emit a failure build event if there are compilation errors.
      failureCb();
    }
  });

  function handler(callback?: () => void): void {
    isBlocked = true;
    callback?.();
  }

  compiler.hooks.invalid.tap('karma', () => handler());
  compiler.hooks.watchRun.tapAsync('karma', (_: any, callback: () => void) => handler(callback));
  compiler.hooks.run.tapAsync('karma', (_: any, callback: () => void) => handler(callback));

  webpackMiddleware = webpackDevMiddleware(compiler, webpackMiddlewareConfig);
  emitter.on('exit', (done: any) => {
    webpackMiddleware.close();
    compiler.close(() => done());
  });

  function unblock() {
    isBlocked = false;
    blocked.forEach((cb) => cb());
    blocked = [];
  }

  let lastCompilationHash: string | undefined;
  let isFirstRun = true;

  return new Promise<void>((resolve) => {
    compiler.hooks.done.tap('karma', (stats) => {
      if (isFirstRun) {
        // This is needed to block Karma from launching browsers before Webpack writes the assets in memory.
        // See the below:
        // https://github.com/karma-runner/karma-chrome-launcher/issues/154#issuecomment-986661937
        // https://github.com/angular/angular-cli/issues/22495
        isFirstRun = false;
        resolve();
      }

      if (stats.hasErrors()) {
        lastCompilationHash = undefined;
      } else if (stats.hash != lastCompilationHash) {
        // Refresh karma only when there are no webpack errors, and if the compilation changed.
        lastCompilationHash = stats.hash;
        emitter.refreshFiles();
      }

      unblock();
    });
  });
};

init.$inject = ['config', 'emitter'];

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

// Copied from "karma-jasmine-diff-reporter" source code:
// In case, when multiple reporters are used in conjunction
// with initSourcemapReporter, they both will show repetitive log
// messages when displaying everything that supposed to write to terminal.
// So just suppress any logs from initSourcemapReporter by doing nothing on
// browser log, because it is an utility reporter,
// unless it's alone in the "reporters" option and base reporter is used.
function muteDuplicateReporterLogging(context: any, config: any) {
  context.writeCommonMsg = () => {};
  const reporterName = '@angular/cli';
  const hasTrailingReporters = config.reporters.slice(-1).pop() !== reporterName;

  if (hasTrailingReporters) {
    context.writeCommonMsg = () => {};
  }
}

// Emits builder events.
const eventReporter: any = function (this: any, baseReporterDecorator: any, config: any) {
  baseReporterDecorator(this);

  muteDuplicateReporterLogging(this, config);

  this.onRunComplete = function (_browsers: any, results: any) {
    if (results.exitCode === 0) {
      successCb();
    } else {
      failureCb();
    }
  };

  // avoid duplicate failure message
  this.specFailure = () => {};
};

eventReporter.$inject = ['baseReporterDecorator', 'config'];

// Strip the server address and webpack scheme (webpack://) from error log.
const sourceMapReporter: any = function (this: any, baseReporterDecorator: any, config: any) {
  baseReporterDecorator(this);
  muteDuplicateReporterLogging(this, config);

  const urlRegexp = /http:\/\/localhost:\d+\/_karma_webpack_\/(webpack:\/)?/gi;

  this.onSpecComplete = function (_browser: any, result: any) {
    if (!result.success) {
      result.log = result.log.map((l: string) => l.replace(urlRegexp, ''));
    }
  };

  // avoid duplicate complete message
  this.onRunComplete = () => {};

  // avoid duplicate failure message
  this.specFailure = () => {};
};

sourceMapReporter.$inject = ['baseReporterDecorator', 'config'];

// When a request is not found in the karma server, try looking for it from the webpack server root.
function fallbackMiddleware() {
  return function (request: http.IncomingMessage, response: http.ServerResponse, next: () => void) {
    if (webpackMiddleware) {
      if (request.url && !new RegExp(`\\/${KARMA_APPLICATION_PATH}\\/.*`).test(request.url)) {
        request.url = '/' + KARMA_APPLICATION_PATH + request.url;
      }
      webpackMiddleware(request, response, () => {
        const alwaysServe = [
          `/${KARMA_APPLICATION_PATH}/runtime.js`,
          `/${KARMA_APPLICATION_PATH}/polyfills.js`,
          `/${KARMA_APPLICATION_PATH}/scripts.js`,
          `/${KARMA_APPLICATION_PATH}/styles.css`,
          `/${KARMA_APPLICATION_PATH}/vendor.js`,
        ];
        if (request.url && alwaysServe.includes(request.url)) {
          response.statusCode = 200;
          response.end();
        } else {
          next();
        }
      });
    } else {
      next();
    }
  };
}

module.exports = {
  'framework:@angular-devkit/build-angular': ['factory', init],
  'reporter:@angular-devkit/build-angular--sourcemap-reporter': ['type', sourceMapReporter],
  'reporter:@angular-devkit/build-angular--event-reporter': ['type', eventReporter],
  'middleware:@angular-devkit/build-angular--blocker': ['factory', requestBlocker],
  'middleware:@angular-devkit/build-angular--fallback': ['factory', fallbackMiddleware],
};
