/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeLibraryBuilder } from '../../builder';
import { BASE_OPTIONS, LIBRARY_BUILDER_INFO, describeLibraryBuilder } from '../setup';

describeLibraryBuilder(executeLibraryBuilder, LIBRARY_BUILDER_INFO, (harness) => {
  describe('Option: "deleteOutputPath"', () => {
    beforeEach(async () => {
      // Add pre-existing files in output directory
      await harness.writeFile('dist/lib/extra.txt', 'EXTRA');
    });

    it('should delete the output files when deleteOutputPath is true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        deleteOutputPath: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/lib/extra.txt').toNotExist();
      harness.expectFile('dist/lib/fesm2022/lib.mjs').toExist();
    });

    it('should not delete existing output files when deleteOutputPath is false', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        deleteOutputPath: false,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/lib/extra.txt').toExist();
      harness.expectFile('dist/lib/fesm2022/lib.mjs').toExist();
    });
  });
});
