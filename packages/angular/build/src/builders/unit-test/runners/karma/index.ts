/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { TestRunner } from '../api';
import { DependencyChecker } from '../dependency-checker';
import { KarmaExecutor } from './executor';

/**
 * A declarative definition of the Karma test runner.
 */
const KarmaTestRunner: TestRunner = {
  name: 'karma',
  isStandalone: true,

  validateDependencies(options) {
    const checker = new DependencyChecker(options.projectSourceRoot);
    checker.check('karma');
    checker.check('karma-jasmine');

    // A custom configuration loads its own launcher plugins and may define custom launchers.
    // The built-in configuration only loads the Chrome launcher, which also provides Chromium.
    if (!options.runnerConfig) {
      checker.check('karma-chrome-launcher');
    }

    if (options.coverage.enabled) {
      checker.check('karma-coverage');
    }

    checker.report();
  },

  getBuildOptions() {
    return {
      buildOptions: {},
    };
  },

  async createExecutor(context, options) {
    return new KarmaExecutor(context, options);
  },
};

export default KarmaTestRunner;
