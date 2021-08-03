/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, SERVER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(execute, SERVER_BUILDER_INFO, (harness) => {
  describe('Option: "externalDependencies"', () => {
    it(`should not bundle dependency when set "externalDependencies" is set.`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
        externalDependencies: ['@angular/core'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      harness.expectFile('dist/main.js').content.toContain('require("@angular/core")');
      harness.expectFile('dist/main.js').content.not.toContain('require("@angular/common")');
    });

    it(`should bundle all dependencies when "externalDependencies" is unset`, async () => {
      harness.useTarget('server', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/main.js').content.not.toContain('require("@angular/core")');
      harness.expectFile('dist/main.js').content.not.toContain('require("@angular/common")');
    });
  });
});
