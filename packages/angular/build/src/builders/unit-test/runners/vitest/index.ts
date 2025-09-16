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
      checker.check('@vitest/browser');
      checker.checkAny(
        ['playwright', 'webdriverio'],
        'The "browsers" option requires either "playwright" or "webdriverio" to be installed.',
      );
    } else {
      // JSDOM is used when no browsers are specified
      checker.check('jsdom');
    }

    if (options.codeCoverage) {
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

    return new VitestExecutor(projectName, options, testEntryPointMappings);
  },
};

export default VitestTestRunner;
