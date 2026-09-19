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
  describe('Behavior: "Library Build"', () => {
    it('should build a library with FESM2022 and DTS bundles', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.error).toBeUndefined();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/lib/fesm2022/lib.mjs').toExist();
      expect(harness.hasFile('dist/lib/fesm2022/lib.mjs')).toBeTrue();
      const fesmContent = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesmContent).toContain('LibComponent');
      expect(fesmContent).toContain('ɵcmp');

      harness.expectFile('dist/lib/types/lib.d.ts').toExist();
      const dtsContent = harness.readFile('dist/lib/types/lib.d.ts');
      expect(dtsContent).toContain('LibComponent');

      harness.expectFile('dist/lib/package.json').toExist();
      const pkgJson = JSON.parse(harness.readFile('dist/lib/package.json'));
      expect(pkgJson).toEqual(
        jasmine.objectContaining({
          name: 'lib',
          type: 'module',
          module: './fesm2022/lib.mjs',
          typings: './types/lib.d.ts',
          exports: jasmine.objectContaining({
            '.': {
              types: './types/lib.d.ts',
              default: './fesm2022/lib.mjs',
            },
          }),
        }),
      );
    });
  });
});
