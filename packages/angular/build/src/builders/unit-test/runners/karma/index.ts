/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { TestRunner } from '../api';
import { KarmaExecutor } from './executor';

/**
 * A declarative definition of the Karma test runner.
 */
const KarmaTestRunner: TestRunner = {
  name: 'karma',
  isStandalone: true,

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
