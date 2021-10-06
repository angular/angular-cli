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
  describe('Option: "inlineCritical"', () => {
    beforeEach(async () => {
      await harness.writeFile('src/styles.css', 'body { color: #000 }');
    });

    it(`should extract critical css when 'inlineCritical' is true`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: {
          scripts: false,
          styles: {
            minify: true,
            inlineCritical: true,
          },
          fonts: false,
        },
        styles: ['src/styles.css'],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/index.html')
        .content.toContain(
          `<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'">`,
        );
      harness.expectFile('dist/index.html').content.toContain(`body{color:#000;}`);
    });

    it(`should not extract critical css when 'optimization' is unset`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
        optimization: undefined,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.not.toContain(`<style`);
    });

    it(`should not extract critical css when 'optimization' is true`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
        optimization: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.not.toContain(`<style`);
    });

    it(`should not extract critical css when 'optimization' is false`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
        optimization: false,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.not.toContain(`<style`);
    });

    it(`should not extract critical css when 'inlineCritical' is false`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
        optimization: {
          scripts: false,
          styles: {
            minify: false,
            inlineCritical: false,
          },
          fonts: false,
        },
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.not.toContain(`<style`);
    });

    it(`should extract critical css when 'inlineCritical' when using 'deployUrl'`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        deployUrl: 'http://cdn.com/',
        optimization: {
          scripts: false,
          styles: {
            minify: true,
            inlineCritical: true,
          },
          fonts: false,
        },
        styles: ['src/styles.css'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/index.html')
        .content.toContain(
          `<link rel="stylesheet" href="http://cdn.com/styles.css" media="print" onload="this.media='all'">`,
        );
      harness.expectFile('dist/index.html').content.toContain(`body{color:#000;}`);
    });

    it(`should extract critical css when using '@media all {}' and 'minify' is set to true`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
        optimization: {
          scripts: false,
          styles: {
            minify: true,
            inlineCritical: true,
          },
          fonts: false,
        },
      });

      await harness.writeFile('src/styles.css', '@media all { body { color: #000 } }');

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/index.html')
        .content.toContain(
          `<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'">`,
        );
      harness.expectFile('dist/index.html').content.toContain(`body{color:#000;}`);
    });
  });
});
