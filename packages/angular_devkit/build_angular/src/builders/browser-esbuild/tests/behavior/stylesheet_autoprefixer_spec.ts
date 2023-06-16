/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildEsbuildBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

const styleBaseContent: Record<string, string> = Object.freeze({
  'css': `
    @import url(imported-styles.css);
    div { hyphens: none; }
  `,
});

const styleImportedContent: Record<string, string> = Object.freeze({
  'css': 'section { hyphens: none; }',
});

describeBuilder(buildEsbuildBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Behavior: "Stylesheet autoprefixer"', () => {
    for (const ext of ['css'] /* ['css', 'sass', 'scss', 'less'] */) {
      it(`should add prefixes for listed browsers in global styles [${ext}]`, async () => {
        await harness.writeFile(
          '.browserslistrc',
          `
          Safari 15.4
          Edge 104
          Firefox 91
         `,
        );

        await harness.writeFiles({
          [`src/styles.${ext}`]: styleBaseContent[ext],
          [`src/imported-styles.${ext}`]: styleImportedContent[ext],
        });

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [`src/styles.${ext}`],
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        harness
          .expectFile('dist/styles.css')
          .content.toMatch(/section\s*{\s*-webkit-hyphens:\s*none;\s*hyphens:\s*none;\s*}/);
        harness
          .expectFile('dist/styles.css')
          .content.toMatch(/div\s*{\s*-webkit-hyphens:\s*none;\s*hyphens:\s*none;\s*}/);
      });

      it(`should not add prefixes if not required by browsers in global styles [${ext}]`, async () => {
        await harness.writeFile(
          '.browserslistrc',
          `
          Edge 110
         `,
        );

        await harness.writeFiles({
          [`src/styles.${ext}`]: styleBaseContent[ext],
          [`src/imported-styles.${ext}`]: styleImportedContent[ext],
        });

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [`src/styles.${ext}`],
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        harness.expectFile('dist/styles.css').content.toMatch(/section\s*{\s*hyphens:\s*none;\s*}/);
        harness.expectFile('dist/styles.css').content.toMatch(/div\s*{\s*hyphens:\s*none;\s*}/);
      });

      it(`should add prefixes for listed browsers in external component styles [${ext}]`, async () => {
        await harness.writeFile(
          '.browserslistrc',
          `
          Safari 15.4
          Edge 104
          Firefox 91
         `,
        );

        await harness.writeFiles({
          [`src/app/app.component.${ext}`]: styleBaseContent[ext],
          [`src/app/imported-styles.${ext}`]: styleImportedContent[ext],
        });
        await harness.modifyFile('src/app/app.component.ts', (content) =>
          content.replace('./app.component.css', `./app.component.${ext}`),
        );

        harness.useTarget('build', {
          ...BASE_OPTIONS,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        harness
          .expectFile('dist/main.js')
          .content.toMatch(
            /section\s*{\\n\s*-webkit-hyphens:\s*none;\\n\s*hyphens:\s*none;\\n\s*}/,
          );
        harness
          .expectFile('dist/main.js')
          .content.toMatch(/div\s*{\\n\s*-webkit-hyphens:\s*none;\\n\s*hyphens:\s*none;\\n\s*}/);
      });

      it(`should not add prefixes if not required by browsers in external component styles [${ext}]`, async () => {
        await harness.writeFile(
          '.browserslistrc',
          `
          Edge 110
         `,
        );

        await harness.writeFiles({
          [`src/app/app.component.${ext}`]: styleBaseContent[ext],
          [`src/app/imported-styles.${ext}`]: styleImportedContent[ext],
        });
        await harness.modifyFile('src/app/app.component.ts', (content) =>
          content.replace('./app.component.css', `./app.component.${ext}`),
        );

        harness.useTarget('build', {
          ...BASE_OPTIONS,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        harness
          .expectFile('dist/main.js')
          .content.toMatch(/section\s*{\\n\s*hyphens:\s*none;\\n\s*}/);
        harness.expectFile('dist/main.js').content.toMatch(/div\s*{\\n\s*hyphens:\s*none;\\n\s*}/);
      });
    }

    it('should add prefixes for listed browsers in inline component styles', async () => {
      await harness.writeFile(
        '.browserslistrc',
        `
          Safari 15.4
          Edge 104
          Firefox 91
         `,
      );

      await harness.modifyFile('src/app/app.component.ts', (content) => {
        return content
          .replace('styleUrls', 'styles')
          .replace('./app.component.css', 'div { hyphens: none; }');
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness
        .expectFile('dist/main.js')
        .content.toMatch(/div\s*{\\n\s*-webkit-hyphens:\s*none;\\n\s*hyphens:\s*none;\\n\s*}/);
    });

    it('should not add prefixes if not required by browsers in inline component styles', async () => {
      await harness.writeFile(
        '.browserslistrc',
        `
          Edge 110
         `,
      );

      await harness.modifyFile('src/app/app.component.ts', (content) => {
        return content
          .replace('styleUrls', 'styles')
          .replace('./app.component.css', 'div { hyphens: none; }');
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/main.js').content.toMatch(/div\s*{\\n\s*hyphens:\s*none;\\n\s*}/);
    });
  });
});
