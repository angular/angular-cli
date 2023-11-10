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
  describe('Option: "deleteOutputPath"', () => {
    beforeEach(async () => {
      // Application code is not needed for asset tests
      await harness.writeFile('src/main.ts', 'console.log("TEST");');

      // Add file in output
      await harness.writeFile('dist/dummy.txt', '');
    });

    it(`should delete the output files when 'deleteOutputPath' is true`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        deleteOutputPath: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/dummy.txt').toNotExist();
    });

    it(`should delete the output files when 'deleteOutputPath' is not set`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        deleteOutputPath: undefined,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/dummy.txt').toNotExist();
    });

    it(`should not delete the output files when 'deleteOutputPath' is false`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        deleteOutputPath: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/dummy.txt').toExist();
    });
  });
});
