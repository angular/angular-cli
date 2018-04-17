/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
exports.config = {
  allScriptsTimeout: 11000,
  specs: [
    './e2e/**/*.e2e-spec.ts'
  ],
  capabilities: {
    'browserName': 'chrome',
    chromeOptions: {
      args: ['--no-sandbox']
    }
  },
  directConnect: true,
  baseUrl: 'http://localhost:8080/',
  framework: 'jasmine',
  onPrepare() {
    require('ts-node').register({
      project: './e2e/tsconfig.json'
    });
  }
};
