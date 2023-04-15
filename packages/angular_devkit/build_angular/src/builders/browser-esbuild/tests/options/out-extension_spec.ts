/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildEsbuildBrowserInternal } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildEsbuildBrowserInternal, BROWSER_BUILDER_INFO, (harness) => {
  describe('Option: "outExtension"', () => {
    it('outputs `.js` files when explicitly set to "js"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        main: 'src/main.ts',
        outExtension: 'js',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // Should generate the correct file extension.
      harness.expectFile('dist/main.js').toExist();
      expect(harness.hasFile('dist/main.mjs')).toBeFalse();

      // Index page should link to the correct file extension.
      const indexContents = harness.readFile('dist/index.html');
      expect(indexContents).toContain('src="main.js"');
    });

    it('outputs `.mjs` files when set to "mjs"', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        main: 'src/main.ts',
        outExtension: 'mjs',
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      // Should generate the correct file extension.
      harness.expectFile('dist/main.mjs').toExist();
      expect(harness.hasFile('dist/main.js')).toBeFalse();

      // Index page should link to the correct file extension.
      const indexContents = harness.readFile('dist/index.html');
      expect(indexContents).toContain('src="main.mjs"');
    });
  });
});
