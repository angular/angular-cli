/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import type { TestRunner } from '../api';
import { getVitestBuildOptions } from './build-options';
import { VitestExecutor } from './executor';

/**
 * A declarative definition of the Vitest test runner.
 */
const VitestTestRunner: TestRunner = {
  name: 'vitest',

  getBuildOptions(options, baseBuildOptions) {
    return getVitestBuildOptions(options, baseBuildOptions);
  },

  async createExecutor(context, options) {
    const projectName = context.target?.project;
    assert(projectName, 'The builder requires a target.');

    return new VitestExecutor(projectName, options);
  },
};

export default VitestTestRunner;
