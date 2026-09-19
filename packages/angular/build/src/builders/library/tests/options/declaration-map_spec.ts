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
  describe('Option: "declarationMap"', () => {
    it('should not emit declaration sourcemaps by default', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // FESM sourcemaps are always enabled
      expect(harness.hasFile('dist/lib/fesm2022/lib.mjs.map')).toBeTrue();
      // DTS sourcemaps are disabled by default
      expect(harness.hasFile('dist/lib/types/lib.d.ts.map')).toBeFalse();
    });

    it('should emit declaration sourcemaps when declarationMap is true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        declarationMap: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // FESM sourcemaps are always enabled
      expect(harness.hasFile('dist/lib/fesm2022/lib.mjs.map')).toBeTrue();
      // DTS sourcemaps should be generated
      expect(harness.hasFile('dist/lib/types/lib.d.ts.map')).toBeTrue();
    });
  });
});
