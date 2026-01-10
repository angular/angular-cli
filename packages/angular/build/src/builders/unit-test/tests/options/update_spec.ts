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
  describe('Option: "update"', () => {
    beforeEach(() => {
      setupApplicationTarget(harness);
    });

    describe('Vitest Runner', () => {
      it('should work with update flag enabled', async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          update: true,
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
      });

      it('should work with update flag disabled', async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          update: false,
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
      });

      it('should work without update flag (default)', async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBeTrue();
      });
    });

    describe('Karma Runner', () => {
      it('should throw an error when update is used with karma', async () => {
        harness.useTarget('test', {
          ...BASE_OPTIONS,
          runner: 'karma',
          update: true,
        });

        const { result, error } = await harness.executeOnce({ outputLogsOnException: false });

        expect(result).toBeUndefined();
        expect(error?.message).toContain(
          'The "update" option is only available for the "vitest" runner.',
        );
      });
    });
  });
});
