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
  describe('Option: "coverage"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should not generate a code coverage report when coverage is false', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        coverage: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(harness.hasFile('coverage/test/index.html')).toBeFalse();
    });

    it('should generate a code coverage report when coverage is true', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        coverage: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(harness.hasFile('coverage/test/index.html')).toBeTrue();
    });
  });
});
