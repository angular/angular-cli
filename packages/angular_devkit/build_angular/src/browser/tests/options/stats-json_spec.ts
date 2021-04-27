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
  describe('Option: "statsJson"', () => {
    beforeEach(async () => {
      // Application code is not needed for stat JSON tests
      await harness.writeFile('src/main.ts', '');
    });

    it('generates a Webpack Stats file in output when true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        statsJson: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      if (harness.expectFile('dist/stats.json').toExist()) {
        const content = harness.readFile('dist/stats.json');
        expect(() => JSON.parse(content))
          .withContext('Expected Webpack Stats file to be valid JSON.')
          .not.toThrow();
      }
    });

    it('includes Webpack profiling information', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        statsJson: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      if (harness.expectFile('dist/stats.json').toExist()) {
        const stats = JSON.parse(harness.readFile('dist/stats.json'));
        expect(stats?.chunks?.[0]?.modules?.[0]?.profile?.building).toBeDefined();
      }
    });

    it('does not generate a Webpack Stats file in output when false', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        statsJson: false,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/stats.json').toNotExist();
    });

    it('does not generate a Webpack Stats file in output when not present', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/stats.json').toNotExist();
    });
  });
});
