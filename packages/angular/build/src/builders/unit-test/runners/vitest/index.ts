/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import type { TestRunner } from '../api';
import { DependencyChecker } from '../dependency-checker';
import { getVitestBuildOptions } from './build-options';
import { VitestExecutor } from './executor';

/**
 * A declarative definition of the Vitest test runner.
 */
const VitestTestRunner: TestRunner = {
  name: 'vitest',

  validateDependencies(options) {
    const checker = new DependencyChecker(options.projectSourceRoot);
    checker.check('vitest');

    if (options.browsers?.length) {
      if (process.versions.webcontainer) {
        checker.check('@vitest/browser-preview');
      } else {
        checker.checkAny(
          ['@vitest/browser-playwright', '@vitest/browser-webdriverio', '@vitest/browser-preview'],
          'The "browsers" option requires either ' +
            '"@vitest/browser-playwright", "@vitest/browser-webdriverio", or "@vitest/browser-preview" to be installed.',
        );
      }
    } else {
      // DOM emulation is used when no browsers are specified
      checker.checkAny(
        ['jsdom', 'happy-dom'],
        'A DOM environment is required for non-browser tests. Please install either "jsdom" or "happy-dom".',
      );
    }

    if (options.coverage.enabled) {
      checker.check('@vitest/coverage-v8');
    }

    checker.report();
  },

  getBuildOptions(options, baseBuildOptions) {
    return getVitestBuildOptions(options, baseBuildOptions);
  },

  async createExecutor(context, options, testEntryPointMappings) {
    const projectName = context.target?.project;
    assert(projectName, 'The builder requires a target.');

    if (!!process.versions.webcontainer && options.browsers?.length) {
      context.logger.info(
        `Webcontainer environment detected. Using '@vitest/browser-preview' for browser-based tests.`,
      );
    }

    if (typeof options.runnerConfig === 'string') {
      context.logger.info(`Using Vitest configuration file: ${options.runnerConfig}`);
    } else if (options.runnerConfig) {
      context.logger.info('Automatically searching for and using Vitest configuration file.');
    }

    return new VitestExecutor(projectName, options, testEntryPointMappings, context.logger);
  },
};

export default VitestTestRunner;
