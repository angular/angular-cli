/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable */
// TODO: cleanup this file, it's copied as is from Angular CLI.
import type { IncomingMessage, ServerResponse } from 'node:http';
import * as path from 'node:path';
import type { Compiler } from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';

import { statsErrorsToString } from '../../utils/stats';
import { logging } from '@angular-devkit/core';
import { BuildOptions } from '../../../../utils/build-options';
import { normalizeSourceMaps } from '../../../../utils/index';

const KARMA_APPLICATION_PATH = '_karma_webpack_';

let webpackMiddleware: webpackDevMiddleware.API<IncomingMessage, ServerResponse>;

const init: any = (config: any, emitter: any) => {
  if (!config.buildWebpack) {
    throw new Error(
      `The '@angular-devkit/build-angular/plugins/karma' karma plugin is meant to` +
        ` be used from within Angular CLI and will not work correctly outside of it.`,
    );
  }
  const options = config.buildWebpack.options as BuildOptions;
  const logger: logging.Logger = config.buildWebpack.logger;

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

  // When using code-coverage, auto-add karma-coverage.
  if (
    options.codeCoverage &&
    !config.reporters.some((r: string) => r === 'coverage' || r === 'coverage-istanbul')
  ) {
    config.reporters.push('coverage');
  }

  const compiler = config.buildWebpack.compiler as Compiler;
  const webpackMiddlewareConfig = {
    // Hide webpack output because its noisy.
    stats: false,
    publicPath: `/${KARMA_APPLICATION_PATH}/`,
  };

  config.webpackMiddleware = { ...webpackMiddlewareConfig, ...config.webpackMiddleware };

  // Our custom context and debug files list the webpack bundles directly instead of using
  // the karma files array.
  config.customContextFile = `${__dirname}/karma-context.html`;
  config.customDebugFile = `${__dirname}/karma-debug.html`;

  // Add the webpack server fallback.
  config.middleware = config.middleware || [];
  config.middleware.push('@angular-devkit/build-angular--fallback');

  webpackMiddleware = webpackDevMiddleware(compiler, webpackMiddlewareConfig);
  emitter.on('exit', (done: any) => {
    webpackMiddleware.close(() => compiler.close(() => done()));
  });

  let lastCompilationHash: string | undefined;

  return new Promise<void>((resolve) => {
    compiler.hooks.done.tap('karma', (stats) => {
      if (stats.hasErrors()) {
        lastCompilationHash = undefined;

        // Only generate needed JSON stats and when needed.
        const statsJson = stats.toJson({
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
      } else if (stats.hash != lastCompilationHash) {
        // Refresh karma only when there are no webpack errors, and if the compilation changed.
        lastCompilationHash = stats.hash;
        emitter.refreshFiles();
      }

      // This is needed to block Karma from launching browsers before Webpack writes the assets in memory.
      // See the below:
      // https://github.com/karma-runner/karma-chrome-launcher/issues/154#issuecomment-986661937
      // https://github.com/angular/angular-cli/issues/22495
      resolve();
    });
  });
};

init.$inject = ['config', 'emitter'];

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
  return function (
    request: IncomingMessage,
    response: ServerResponse,
    next: (err?: unknown) => void,
  ) {
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
  'middleware:@angular-devkit/build-angular--fallback': ['factory', fallbackMiddleware],
};
