/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Option: "main"', () => {
    it('uses a provided TypeScript file', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        main: 'src/main.ts',
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/runtime.js').toExist();
      harness.expectFile('dist/main.js').toExist();
      harness.expectFile('dist/index.html').toExist();
    });

    it('uses a provided JavaScript file', async () => {
      await harness.writeFile('src/main.js', `console.log('main');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        main: 'src/main.js',
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/runtime.js').toExist();
      harness.expectFile('dist/main.js').toExist();
      harness.expectFile('dist/index.html').toExist();

      harness.expectFile('dist/main.js').content.toContain(`console.log('main')`);
    });

    it('fails and shows an error when file does not exist', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        main: 'src/missing.ts',
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });

      expect(result?.success).toBe(false);
      expect(logs).toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching('Module not found:') }),
      );

      harness.expectFile('dist/runtime.js').toNotExist();
      harness.expectFile('dist/main.js').toNotExist();
      harness.expectFile('dist/index.html').toNotExist();
    });
  });
});
