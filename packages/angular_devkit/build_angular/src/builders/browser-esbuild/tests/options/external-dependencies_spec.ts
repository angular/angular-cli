/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildEsbuildBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildEsbuildBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Option: "externalDependencies"', () => {
    it('should not externalize any dependency when option is not set', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('dist/main.js').content.not.toMatch(/from ['"]@angular\/core['"]/);
      harness.expectFile('dist/main.js').content.not.toMatch(/from ['"]@angular\/common['"]/);
    });

    it('should only externalize the listed depedencies when option is set', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        externalDependencies: ['@angular/core'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/main.js').content.toMatch(/from ['"]@angular\/core['"]/);
      harness.expectFile('dist/main.js').content.not.toMatch(/from ['"]@angular\/common['"]/);
    });
  });
});
