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
  expectLog,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Option: "isolate"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should fail when isolate is true and runner is karma', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        runner: 'karma' as any,
        isolate: true,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
      expectLog(logs, /The "isolate" option is only available for the "vitest" runner/);
    });

    it('should run tests successfully when isolate is true and runner is vitest', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        runner: 'vitest' as any,
        isolate: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should run tests successfully when isolate is false and runner is vitest', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        runner: 'vitest' as any,
        isolate: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
