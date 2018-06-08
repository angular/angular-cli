/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

const path = require('path');

module.exports = function (config) {
  config.set({
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-webpack'),
      require('@angular-devkit/build-karma/plugins/karma'),
    ],
    files: [
      path.join(__dirname, 'src/test.js'),
    ],
    preprocessors: {
      [path.join(__dirname, 'src/test.js')]: ['webpack']
    },
    // Karma doesn't show any logs because we removed the 'progress' reporter
    // and set 'logLevel' to 'config.LOG_DISABLE' in karma and 'silent' in webpack.
    reporters: [
      '@angular-devkit/build-karma',
    ],
    logLevel: config.LOG_DISABLE,
    webpack: {
      mode: 'development',
      resolve: { extensions: ['.js'] },
    },
    webpackMiddleware: { logLevel: 'silent' },
    browsers: ['ChromeHeadless'],
    singleRun: true
  });
};
