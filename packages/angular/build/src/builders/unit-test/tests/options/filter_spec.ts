/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../builder';
import {
  BASE_OPTIONS,
  describeBuilder,
  UNIT_TEST_BUILDER_INFO,
  setupApplicationTarget,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Option: "filter"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);

      await harness.writeFiles({
        'src/app/pass.spec.ts': `
          describe('Passing Suite', () => {
            it('should pass', () => {
              expect(true).toBe(true);
            });
          });
        `,
        'src/app/fail.spec.ts': `
          describe('Failing Suite', () => {
            it('should fail', () => {
              expect(true).toBe(false);
            });
          });
        `,
      });
    });

    it('should only run tests that match the filter regex', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        // This filter should only match the 'should pass' test
        filter: 'pass$',
      });

      const { result } = await harness.executeOnce();
      // The overall result should be success because the failing test was filtered out.
      expect(result?.success).toBe(true);
    });

    it('should run all tests when no filter is provided', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      // The overall result should be failure because the failing test was included.
      expect(result?.success).toBe(false);
    });
  });
});
