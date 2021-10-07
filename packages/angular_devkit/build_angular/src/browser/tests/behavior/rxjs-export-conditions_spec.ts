/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Behavior: "RxJS ES2015 exports condition"', () => {
    it('uses the rxjs ES2015 distribution files with rxjs 7.x', async () => {
      // The `es2015` export condition is enabled by the browser webpack configuration partial.
      // This should cause the application output to contain the ES2015 code and not the ES5 code.

      // Add rxjs usage to ensure it is present in the application output
      // The `rxjs-7` module specifier (and accompanying root package.json entry) is required to
      // support testing rxjs 7 while the actual CLI dependencies are still using rxjs 6 since
      // bazel unit test setup uses the main package.json dependencies during test.
      await harness.modifyFile(
        'src/main.ts',
        (content) => `import { of } from 'rxjs-7';\n` + content + '\nof(1, 2, 3);',
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        vendorChunk: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/vendor.js')
        .content.not.toContain('./node_modules/rxjs-7/dist/esm5/');
      harness.expectFile('dist/vendor.js').content.toContain('./node_modules/rxjs-7/dist/esm/');
      harness.expectFile('dist/vendor.js').content.not.toContain('var Observable');
      harness.expectFile('dist/vendor.js').content.toContain('class Observable');
    });
  });
});
