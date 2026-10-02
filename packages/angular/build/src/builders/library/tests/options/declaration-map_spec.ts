/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeLibraryBuilder } from '../../builder';
import { BASE_OPTIONS, LIBRARY_BUILDER_INFO, describeLibraryBuilder } from '../setup';
import { join } from 'node:path';

describeLibraryBuilder(executeLibraryBuilder, LIBRARY_BUILDER_INFO, (harness) => {
  describe('Option: "declarationMap"', () => {
    it('should not emit declaration sourcemaps by default', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // FESM sourcemaps are always enabled
      harness.expectFile('dist/lib/fesm2022/lib.mjs.map').toExist();
      // DTS sourcemaps are disabled by default
      harness.expectFile('dist/lib/types/lib.d.ts.map').toNotExist();
    });

    it('should emit declaration sourcemaps when declarationMap is true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        declarationMap: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // FESM sourcemaps are always enabled
      harness.expectFile('dist/lib/fesm2022/lib.mjs.map').toExist();

      // DTS sourcemaps should be generated
      harness.expectFile('dist/lib/types/lib.d.ts.map').toExist();
      const dtsMap = JSON.parse(harness.readFile('dist/lib/types/lib.d.ts.map'));
      expect(dtsMap.sources).toContain('../../../projects/lib/src/lib/lib.component.ts');
      harness.expectFile(join('dist/lib/types', dtsMap.sources[0])).toExist();
    });
  });
});
