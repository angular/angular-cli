/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "extractLicenses"', () => {
    it(`should generate '3rdpartylicenses.txt' when 'extractLicenses' is true`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        extractLicenses: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/3rdpartylicenses.txt').content.toContain('MIT');
    });

    it(`should not generate '3rdpartylicenses.txt' when 'extractLicenses' is false`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        extractLicenses: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/3rdpartylicenses.txt').toNotExist();
    });

    it(`should generate '3rdpartylicenses.txt' when 'extractLicenses' is not set`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/3rdpartylicenses.txt').content.toContain('MIT');
    });

    it(`should generate '3rdpartylicenses.txt' when 'extractLicenses' and 'localize' are true`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        localize: true,
        extractLicenses: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/3rdpartylicenses.txt').content.toContain('MIT');
      harness.expectFile('dist/browser/en-US/main.js').toExist();
    });
  });
});
