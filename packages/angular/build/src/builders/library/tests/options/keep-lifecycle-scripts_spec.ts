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
  describe('Option: "keepLifecycleScripts"', () => {
    it('should remove scripts from package.json by default', async () => {
      await harness.writeFile(
        'projects/lib/package.json',
        JSON.stringify({
          name: 'my-lib',
          version: '1.0.0',
          exports: {
            '.': './src/public-api.ts',
          },
          scripts: {
            postinstall: 'echo postinstall',
          },
        }),
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const distPackageJson = JSON.parse(harness.readFile('dist/lib/package.json'));
      expect(distPackageJson.scripts).toBeUndefined();
    });

    it('should preserve scripts in package.json when keepLifecycleScripts is true', async () => {
      await harness.writeFile(
        'projects/lib/package.json',
        JSON.stringify({
          name: 'my-lib',
          version: '1.0.0',
          exports: {
            '.': './src/public-api.ts',
          },
          scripts: {
            postinstall: 'echo postinstall',
          },
        }),
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        keepLifecycleScripts: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const distPackageJson = JSON.parse(harness.readFile('dist/lib/package.json'));
      expect(distPackageJson.scripts).toEqual({
        postinstall: 'echo postinstall',
      });
    });
  });
});
