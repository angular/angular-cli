/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget) => {
  describe('Option: "browsers"', () => {
    it('should warn if jsdom is used', async () => {
      await setupTarget(harness);

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        browsers: BASE_OPTIONS.browsers + ',jsdom',
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(
            `'jsdom' does not support ESM code execution and cannot be used for karma testing.`,
          ),
        }),
      );
    });
  });
});
