/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

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

      await harness.executeWithCases(
        [
          async ({ result }) => {
            expect(result?.success).toBe(true);
            harness.expectFile('dist/browser/styles.css').content.toContain('color: aqua');
            harness.expectFile('dist/browser/styles.css').content.not.toContain('color: blue');

            await harness.writeFile(
              'src/a.scss',
              'invalid-invalid-invalid\\nh1 { color: $primary; }',
            );
          },
          async ({ result }) => {
            expect(result?.success).toBe(false);

            await harness.writeFile('src/a.scss', '$primary: blue;\\nh1 { color: $primary; }');
          },
          ({ result }) => {
            expect(result?.success).toBe(true);
            harness.expectFile('dist/browser/styles.css').content.not.toContain('color: aqua');
            harness.expectFile('dist/browser/styles.css').content.toContain('color: blue');
          },
        ],
        { outputLogsOnFailure: false },
      );
    });

    it('rebuilds Sass stylesheet after error on initial build from import', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
        styles: ['src/styles.scss'],
      });

      await harness.writeFile('src/styles.scss', "@import './a';");
      await harness.writeFile('src/a.scss', 'invalid-invalid-invalid\\nh1 { color: $primary; }');

      await harness.executeWithCases(
        [
          async ({ result }) => {
            expect(result?.success).toBe(false);

            await harness.writeFile('src/a.scss', '$primary: aqua;\\nh1 { color: $primary; }');
          },
          async ({ result }) => {
            expect(result?.success).toBe(true);
            harness.expectFile('dist/browser/styles.css').content.toContain('color: aqua');
            harness.expectFile('dist/browser/styles.css').content.not.toContain('color: blue');

            await harness.writeFile('src/a.scss', '$primary: blue;\\nh1 { color: $primary; }');
          },
          ({ result }) => {
            expect(result?.success).toBe(true);
            harness.expectFile('dist/browser/styles.css').content.not.toContain('color: aqua');
            harness.expectFile('dist/browser/styles.css').content.toContain('color: blue');
          },
        ],
        { outputLogsOnFailure: false },
      );
    });

    it('recovers from error in SCSS partial after fix on rebuild using @use', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
        styles: ['src/styles.scss'],
      });

      await harness.writeFile('src/styles.scss', "@use './variables' as v;\nh1 { color: v.$primary; }");
      await harness.writeFile('src/variables.scss', '$primary: aqua;');

      await harness.executeWithCases(
        [
          async ({ result }) => {
            expect(result?.success).toBe(true);
            harness.expectFile('dist/browser/styles.css').content.toContain('color: aqua');

            // Introduce a syntax error in the imported partial
            await harness.writeFile('src/variables.scss', '$primary: aqua\n$broken;');
          },
          async ({ result }) => {
            expect(result?.success).toBe(false);

            // Fix the partial — the cached error should be cleared
            await harness.writeFile('src/variables.scss', '$primary: blue;');
          },
          ({ result }) => {
            expect(result?.success).toBe(true);
            harness.expectFile('dist/browser/styles.css').content.not.toContain('color: aqua');
            harness.expectFile('dist/browser/styles.css').content.toContain('color: blue');
          },
        ],
        { outputLogsOnFailure: false },
      );
    });

    it('recovers from error in SCSS partial after fix on initial build using @use', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
        styles: ['src/styles.scss'],
      });

      await harness.writeFile('src/styles.scss', "@use './variables' as v;\nh1 { color: v.$primary; }");
      // Start with an error in the partial
      await harness.writeFile('src/variables.scss', '$primary: aqua\n$broken;');

      await harness.executeWithCases(
        [
          async ({ result }) => {
            expect(result?.success).toBe(false);

            // Fix the partial
            await harness.writeFile('src/variables.scss', '$primary: aqua;');
          },
          ({ result }) => {
            expect(result?.success).toBe(true);
            harness.expectFile('dist/browser/styles.css').content.toContain('color: aqua');
          },
        ],
        { outputLogsOnFailure: false },
      );
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

      await harness.executeWithCases(
        [
          async ({ result }) => {
            expect(result?.success).toBe(false);

            await harness.writeFile('src/a.scss', '$primary: aqua;\\nh1 { color: $primary; }');
          },
          async ({ result }) => {
            expect(result?.success).toBe(true);
            harness.expectFile('dist/browser/styles.css').content.toContain('color: aqua');
            harness.expectFile('dist/browser/styles.css').content.not.toContain('color: blue');

            harness.expectFile('dist/browser/other.css').content.toContain('color: green');
            harness.expectFile('dist/browser/other.css').content.toContain('color: aqua');
            harness.expectFile('dist/browser/other.css').content.not.toContain('color: blue');

            await harness.writeFile('src/a.scss', '$primary: blue;\\nh1 { color: $primary; }');
          },
          ({ result }) => {
            expect(result?.success).toBe(true);
            harness.expectFile('dist/browser/styles.css').content.not.toContain('color: aqua');
            harness.expectFile('dist/browser/styles.css').content.toContain('color: blue');

            harness.expectFile('dist/browser/other.css').content.toContain('color: green');
            harness.expectFile('dist/browser/other.css').content.not.toContain('color: aqua');
            harness.expectFile('dist/browser/other.css').content.toContain('color: blue');
          },
        ],
        { outputLogsOnFailure: false },
      );
    });
  });
});
