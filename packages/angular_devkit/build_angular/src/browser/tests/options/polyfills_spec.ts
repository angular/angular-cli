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
  describe('Option: "polyfills"', () => {
    it('uses a provided TypeScript file', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        polyfills: 'src/polyfills.ts',
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/polyfills.js').toExist();
    });

    it('uses a provided JavaScript file', async () => {
      await harness.writeFile('src/polyfills.js', `console.log('main');`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        polyfills: 'src/polyfills.js',
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/polyfills.js').content.toContain(`console.log('main')`);
    });

    it('fails and shows an error when file does not exist', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        polyfills: 'src/missing.ts',
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });

      expect(result?.success).toBe(false);
      expect(logs).toContain(
        jasmine.objectContaining({ message: jasmine.stringMatching('Module not found:') }),
      );

      harness.expectFile('dist/polyfills.js').toNotExist();
    });
  });
});
