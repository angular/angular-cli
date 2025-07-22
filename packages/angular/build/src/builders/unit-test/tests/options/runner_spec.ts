/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import {
  BASE_OPTIONS,
  describeBuilder,
  UNIT_TEST_BUILDER_INFO,
  setupApplicationTarget,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  xdescribe('Option: "runner"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should fail when runner is not provided', async () => {
      const { runner, ...rest } = BASE_OPTIONS;
      harness.useTarget('test', rest as any);

      await expectAsync(harness.executeOnce()).toBeRejectedWithError(/"runner" is required/);
    });

    it('should fail when runner is invalid', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        runner: 'invalid' as any,
      });

      await expectAsync(harness.executeOnce()).toBeRejectedWithError(
        /must be one of the following values: "karma", "vitest"/,
      );
    });
  });
});
