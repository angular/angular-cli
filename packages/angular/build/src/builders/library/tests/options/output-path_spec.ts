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
  describe('Option: "outputPath"', () => {
    it('should default outputPath to dist/{projectName} when omitted', async () => {
      const { outputPath: _, ...optionsWithoutOutputPath } = BASE_OPTIONS;
      harness.useTarget('build', optionsWithoutOutputPath);

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/lib/fesm2022/lib.mjs').toExist();
      harness.expectFile('dist/lib/package.json').toExist();
    });

    it('should use custom outputPath when specified', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        outputPath: 'dist/custom-output',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/custom-output/fesm2022/lib.mjs').toExist();
      harness.expectFile('dist/custom-output/package.json').toExist();
    });
  });
});
