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
  describe('Option: "exclude"', () => {
    beforeEach(() => {
      setupTarget(harness);
    });

    beforeEach(async () => {
      await harness.writeFiles({
        'src/app/error.spec.ts': `
        describe('Error spec', () => {
          it('should error', () => {
            expect(false).toBe(true);
          });
        });`,
      });
    });

    it(`should not exclude any spec when exclude is not supplied`, async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
    });

    it(`should exclude spec that matches the 'exclude' glob pattern`, async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        exclude: ['**/error.spec.ts'],
      });
      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it(`should exclude spec that matches the 'exclude' pattern with a relative project root`, async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        exclude: ['src/app/error.spec.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it(`should exclude spec that matches the 'exclude' pattern prefixed with a slash`, async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        exclude: ['/src/app/error.spec.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
