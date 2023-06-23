/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
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
      harness.expectFile('dist/index.html').content.toContain(`body{color:#000}`);
    });

    it(`should extract critical css when 'optimization' is unset`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
        optimization: undefined,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/index.html')
        .content.toContain(
          `<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'">`,
        );
      harness.expectFile('dist/index.html').content.toContain(`body{color:#000}`);
    });

    it(`should extract critical css when 'optimization' is true`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
        optimization: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/index.html')
        .content.toContain(
          `<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'">`,
        );
      harness.expectFile('dist/index.html').content.toContain(`body{color:#000}`);
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
      harness.expectFile('dist/index.html').content.toContain(`body{color:#000}`);
    });
  });
});
