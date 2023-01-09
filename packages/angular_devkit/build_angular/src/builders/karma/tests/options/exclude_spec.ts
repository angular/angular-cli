/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(execute, KARMA_BUILDER_INFO, (harness) => {
  describe('Option: "exclude"', () => {
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

    it(`should exclude spec that matches the 'exclude' pattern`, async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        exclude: ['**/error.spec.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
