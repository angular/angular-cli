/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { concatMap, count, take, timeout } from 'rxjs';
import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

/**
 * Maximum time in milliseconds for single build/rebuild
 * This accounts for CI variability.
 */
export const BUILD_TIMEOUT = 30_000;

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Rebuilds when global stylesheets change"', () => {
    beforeEach(async () => {
      // Application code is not needed for styles tests
      await harness.writeFile('src/main.ts', 'console.log("TEST");');
    });

    it('rebuilds Sass stylesheet after error on rebuild from import', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
        styles: ['src/styles.scss'],
      });

      await harness.writeFile('src/styles.scss', "@import './a';");
      await harness.writeFile('src/a.scss', '$primary: aqua;\\nh1 { color: $primary; }');

      const buildCount = await harness
        .execute({ outputLogsOnFailure: false })
        .pipe(
          timeout(30000),
          concatMap(async ({ result }, index) => {
            switch (index) {
              case 0:
                expect(result?.success).toBe(true);
                harness.expectFile('dist/browser/styles.css').content.toContain('color: aqua');
                harness.expectFile('dist/browser/styles.css').content.not.toContain('color: blue');

                await harness.writeFile(
                  'src/a.scss',
                  'invalid-invalid-invalid\\nh1 { color: $primary; }',
                );
                break;
              case 1:
                expect(result?.success).toBe(false);

                await harness.writeFile('src/a.scss', '$primary: blue;\\nh1 { color: $primary; }');
                break;
              case 2:
                expect(result?.success).toBe(true);
                harness.expectFile('dist/browser/styles.css').content.not.toContain('color: aqua');
                harness.expectFile('dist/browser/styles.css').content.toContain('color: blue');

                break;
            }
          }),
          take(3),
          count(),
        )
        .toPromise();

      expect(buildCount).toBe(3);
    });

    it('rebuilds Sass stylesheet after error on initial build from import', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
        styles: ['src/styles.scss'],
      });

      await harness.writeFile('src/styles.scss', "@import './a';");
      await harness.writeFile('src/a.scss', 'invalid-invalid-invalid\\nh1 { color: $primary; }');

      const buildCount = await harness
        .execute({ outputLogsOnFailure: false })
        .pipe(
          timeout(30000),
          concatMap(async ({ result }, index) => {
            switch (index) {
              case 0:
                expect(result?.success).toBe(false);

                await harness.writeFile('src/a.scss', '$primary: aqua;\\nh1 { color: $primary; }');
                break;
              case 1:
                expect(result?.success).toBe(true);
                harness.expectFile('dist/browser/styles.css').content.toContain('color: aqua');
                harness.expectFile('dist/browser/styles.css').content.not.toContain('color: blue');

                await harness.writeFile('src/a.scss', '$primary: blue;\\nh1 { color: $primary; }');
                break;
              case 2:
                expect(result?.success).toBe(true);
                harness.expectFile('dist/browser/styles.css').content.not.toContain('color: aqua');
                harness.expectFile('dist/browser/styles.css').content.toContain('color: blue');
                break;
            }
          }),
          take(3),
          count(),
        )
        .toPromise();

      expect(buildCount).toBe(3);
    });

    it('rebuilds dependent Sass stylesheets after error on initial build from import', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
        styles: [
          { bundleName: 'styles', input: 'src/styles.scss' },
          { bundleName: 'other', input: 'src/other.scss' },
        ],
      });

      await harness.writeFile('src/styles.scss', "@import './a';");
      await harness.writeFile('src/other.scss', "@import './a'; h1 { color: green; }");
      await harness.writeFile('src/a.scss', 'invalid-invalid-invalid\\nh1 { color: $primary; }');

      const buildCount = await harness
        .execute({ outputLogsOnFailure: false })
        .pipe(
          timeout(30000),
          concatMap(async ({ result }, index) => {
            switch (index) {
              case 0:
                expect(result?.success).toBe(false);

                await harness.writeFile('src/a.scss', '$primary: aqua;\\nh1 { color: $primary; }');
                break;
              case 1:
                expect(result?.success).toBe(true);
                harness.expectFile('dist/browser/styles.css').content.toContain('color: aqua');
                harness.expectFile('dist/browser/styles.css').content.not.toContain('color: blue');

                harness.expectFile('dist/browser/other.css').content.toContain('color: green');
                harness.expectFile('dist/browser/other.css').content.toContain('color: aqua');
                harness.expectFile('dist/browser/other.css').content.not.toContain('color: blue');

                await harness.writeFile('src/a.scss', '$primary: blue;\\nh1 { color: $primary; }');
                break;
              case 2:
                expect(result?.success).toBe(true);
                harness.expectFile('dist/browser/styles.css').content.not.toContain('color: aqua');
                harness.expectFile('dist/browser/styles.css').content.toContain('color: blue');

                harness.expectFile('dist/browser/other.css').content.toContain('color: green');
                harness.expectFile('dist/browser/other.css').content.not.toContain('color: aqua');
                harness.expectFile('dist/browser/other.css').content.toContain('color: blue');
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
});
