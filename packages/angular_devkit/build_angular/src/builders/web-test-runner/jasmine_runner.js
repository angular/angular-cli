/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import {
  getConfig,
  sessionFailed,
  sessionFinished,
  sessionStarted,
} from '@web/test-runner-core/browser/session.js';

/** Executes Angular Jasmine tests in the given environment and reports the results to Web Test Runner. */
export async function runJasmineTests(jasmineEnv) {
  const allSpecs = [];
  const failedSpecs = [];

  jasmineEnv.addReporter({
    specDone(result) {
      const expectations = [...result.passedExpectations, ...result.failedExpectations];
      allSpecs.push(...expectations.map((e) => ({ name: e.fullName, passed: e.passed })));

      for (const e of result.failedExpectations) {
        const message = `${result.fullName}\n${e.message}\n${e.stack}`;
        // eslint-disable-next-line no-console
        console.error(message);
        failedSpecs.push({
          message,
          name: e.fullName,
          stack: e.stack,
          expected: e.expected,
          actual: e.actual,
        });
      }
    },

    async jasmineDone(result) {
      // eslint-disable-next-line no-console
      console.log(`Tests ${result.overallStatus}!`);
      await sessionFinished({
        passed: result.overallStatus === 'passed',
        errors: failedSpecs,
        testResults: {
          name: '',
          suites: [],
          tests: allSpecs,
        },
      });
    },
  });

  await sessionStarted();

  // Web Test Runner uses a different HTML page for every test, so we only get one `testFile` for the single `*.js` file we need to execute.
  const { testFile, testFrameworkConfig } = await getConfig();
  const config = { defaultTimeoutInterval: 60_000, ...(testFrameworkConfig ?? {}) };

  // eslint-disable-next-line no-undef
  jasmine.DEFAULT_TIMEOUT_INTERVAL = config.defaultTimeoutInterval;

  // Initialize `TestBed` automatically for users. This assumes we already evaluated `zone.js/testing`.
  getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting(), {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  });

  // Load the test file and evaluate it.
  try {
    // eslint-disable-next-line no-undef
    await import(new URL(testFile, document.baseURI).href);

    // Execute the test functions.
    // eslint-disable-next-line no-undef
    jasmineEnv.execute();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    await sessionFailed(err);
  }
}
