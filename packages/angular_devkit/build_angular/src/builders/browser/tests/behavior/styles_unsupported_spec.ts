/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Behavior: "Style Unsupported"', () => {
    it('errors when importing a css file as an ECMA module (Webpack specific behaviour)', async () => {
      await harness.writeFiles({
        'src/test-style.css': '.test-a {color: red}',
        'src/main.ts': `import './test-style.css'`,
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: [],
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching('./src/test-style.css:1:0 - Error'),
        }),
      );
    });
  });
});
