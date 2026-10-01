/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join } from 'node:path';
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
      const fesmContent = harness.readFile('dist/lib/fesm2022/lib.mjs');
      expect(fesmContent).toContain('LibComponent');
      expect(fesmContent).toContain('ɵcmp');

      harness.expectFile('dist/lib/fesm2022/lib.mjs.map').toExist();
      const fesmMap = JSON.parse(harness.readFile('dist/lib/fesm2022/lib.mjs.map'));
      expect(fesmMap.sources).toContain('../../../projects/lib/src/lib/lib.component.ts');
      harness.expectFile(join('dist/lib/fesm2022', fesmMap.sources[0])).toExist();

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

    it('should log Rolldown bundler warnings', async () => {
      await harness.writeFile(
        'projects/lib/src/public-api.ts',
        `export function runDynamic(code: string) { return eval(code); }`,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).toContain(
        jasmine.objectContaining({
          level: 'warn',
          message: jasmine.stringContaining('eval'),
        }),
      );
    });
  });
});
