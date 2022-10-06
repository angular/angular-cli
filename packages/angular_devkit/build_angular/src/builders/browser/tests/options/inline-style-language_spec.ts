/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { concatMap, count, take, timeout } from 'rxjs/operators';
import { buildWebpackBrowser } from '../../index';
import { InlineStyleLanguage } from '../../schema';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
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
          harness.expectFile('dist/main.js').content.toContain('color: indianred');
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
          harness.expectFile('dist/main.js').content.toContain('color: indianred');
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
          harness.expectFile('dist/main.js').content.toContain('color: indianred');
        });

        it('updates produced stylesheet in watch mode', async () => {
          harness.useTarget('build', {
            ...BASE_OPTIONS,
            main: 'src/main.ts',
            inlineStyleLanguage: InlineStyleLanguage.Scss,
            aot,
            watch: true,
          });

          await harness.modifyFile('src/app/app.component.ts', (content) =>
            content.replace('__STYLE_MARKER__', '$primary: indianred;\\nh1 { color: $primary; }'),
          );

          const buildCount = await harness
            .execute()
            .pipe(
              timeout(30000),
              concatMap(async ({ result }, index) => {
                expect(result?.success).toBe(true);

                switch (index) {
                  case 0:
                    harness.expectFile('dist/main.js').content.toContain('color: indianred');
                    harness.expectFile('dist/main.js').content.not.toContain('color: aqua');

                    await harness.modifyFile('src/app/app.component.ts', (content) =>
                      content.replace(
                        '$primary: indianred;\\nh1 { color: $primary; }',
                        '$primary: aqua;\\nh1 { color: $primary; }',
                      ),
                    );
                    break;
                  case 1:
                    harness.expectFile('dist/main.js').content.not.toContain('color: indianred');
                    harness.expectFile('dist/main.js').content.toContain('color: aqua');

                    await harness.modifyFile('src/app/app.component.ts', (content) =>
                      content.replace(
                        '$primary: aqua;\\nh1 { color: $primary; }',
                        '$primary: blue;\\nh1 { color: $primary; }',
                      ),
                    );
                    break;
                  case 2:
                    harness.expectFile('dist/main.js').content.not.toContain('color: indianred');
                    harness.expectFile('dist/main.js').content.not.toContain('color: aqua');
                    harness.expectFile('dist/main.js').content.toContain('color: blue');
                    break;
                }
              }),
              take(3),
              count(),
            )
            .toPromise();

          expect(buildCount).toBe(3);
        });
      });
    }
  });
});
