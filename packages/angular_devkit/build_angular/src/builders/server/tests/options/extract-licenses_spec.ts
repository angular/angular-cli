/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, SERVER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(execute, SERVER_BUILDER_INFO, (harness) => {
  describe('Option: "extractLicenses"', () => {
    it(`should generate '3rdpartylicenses.txt' when 'extractLicenses' is true`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
        extractLicenses: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/3rdpartylicenses.txt').content.toContain('MIT');
    });

    it(`should not generate '3rdpartylicenses.txt' when 'extractLicenses' is false`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
        extractLicenses: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/3rdpartylicenses.txt').toNotExist();
    });

    it(`should generate '3rdpartylicenses.txt' when 'extractLicenses' is not set`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/3rdpartylicenses.txt').content.toContain('MIT');
    });
  });
});
