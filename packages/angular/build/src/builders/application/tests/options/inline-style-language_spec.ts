/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { InlineStyleLanguage } from '../../schema';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "inlineStyleLanguage"', () => {
    beforeEach(async () => {
      // Setup application component with inline style property
      await harness.modifyFile('src/app/app.component.ts', (content) => {
        return content
          .replace('styleUrls', 'styles')
          .replace('./app.component.css', '__STYLE_MARKER__');
      });
    });

    for (const aot of [true, false]) {
      describe(`[${aot ? 'AOT' : 'JIT'}]`, () => {
        it('supports SCSS inline component styles when set to "scss"', async () => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            inlineStyleLanguage: InlineStyleLanguage.Scss,
            aot,
          });

          await harness.modifyFile('src/app/app.component.ts', (content) =>
            content.replace('__STYLE_MARKER__', '$primary: indianred;\\nh1 { color: $primary; }'),
          );

          const { result } = await harness.executeOnce();

          expect(result?.success).toBe(true);
          harness.expectFile('dist/browser/main.js').content.toContain('color: indianred');
        });

        it('supports Sass inline component styles when set to "sass"', async () => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            inlineStyleLanguage: InlineStyleLanguage.Sass,
            aot,
          });

          await harness.modifyFile('src/app/app.component.ts', (content) =>
            content.replace('__STYLE_MARKER__', '$primary: indianred\\nh1\\n\\tcolor: $primary'),
          );

          const { result } = await harness.executeOnce();

          expect(result?.success).toBe(true);
          harness.expectFile('dist/browser/main.js').content.toContain('color: indianred');
        });

        it('supports Less inline component styles when set to "less"', async () => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            inlineStyleLanguage: InlineStyleLanguage.Less,
            aot,
          });

          await harness.modifyFile('src/app/app.component.ts', (content) =>
            content.replace('__STYLE_MARKER__', '@primary: indianred;\\nh1 { color: @primary; }'),
          );

          const { result } = await harness.executeOnce();

          expect(result?.success).toBe(true);
          harness.expectFile('dist/browser/main.js').content.toContain('color: indianred');
        });

        it('updates produced stylesheet in watch mode', async () => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            inlineStyleLanguage: InlineStyleLanguage.Scss,
            aot,
            watch: true,
          });

          await harness.modifyFile('src/app/app.component.ts', (content) =>
            content.replace('__STYLE_MARKER__', '$primary: indianred;\\nh1 { color: $primary; }'),
          );

          await harness.executeWithCases([
            async ({ result }) => {
              expect(result?.success).toBe(true);
              harness.expectFile('dist/browser/main.js').content.toContain('color: indianred');
              harness.expectFile('dist/browser/main.js').content.not.toContain('color: aqua');

              await harness.modifyFile('src/app/app.component.ts', (content) =>
                content.replace(
                  '$primary: indianred;\\nh1 { color: $primary; }',
                  '$primary: aqua;\\nh1 { color: $primary; }',
                ),
              );
            },
            async ({ result }) => {
              expect(result?.success).toBe(true);
              harness.expectFile('dist/browser/main.js').content.not.toContain('color: indianred');
              harness.expectFile('dist/browser/main.js').content.toContain('color: aqua');

              await harness.modifyFile('src/app/app.component.ts', (content) =>
                content.replace(
                  '$primary: aqua;\\nh1 { color: $primary; }',
                  '$primary: blue;\\nh1 { color: $primary; }',
                ),
              );
            },
            ({ result }) => {
              expect(result?.success).toBe(true);
              harness.expectFile('dist/browser/main.js').content.not.toContain('color: indianred');
              harness.expectFile('dist/browser/main.js').content.not.toContain('color: aqua');
              harness.expectFile('dist/browser/main.js').content.toContain('color: blue');
            },
          ]);
        });
      });
    }
  });
});
