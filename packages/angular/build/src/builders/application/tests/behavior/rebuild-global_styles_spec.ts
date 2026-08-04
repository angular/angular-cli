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

    it('rebuilds PostCSS stylesheet after error on rebuild from plugin dependency', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
        styles: ['src/styles.css'],
      });

      await harness.writeFile(
        'test-plugin.js',
        `
        const fs = require('fs');
        const path = require('path');
        module.exports = () => {
          return {
            postcssPlugin: 'test-plugin',
            Once(root, { result }) {
              const themePath = path.join(path.dirname(root.source.input.file), 'theme.json');
              result.messages.push({
                type: 'dependency',
                file: themePath,
              });
              const data = fs.readFileSync(themePath, 'utf-8');
              const json = JSON.parse(data);
              root.append('body { color: ' + json.color + '; }');
            },
          };
        };
        module.exports.postcss = true;
        `,
      );
      await harness.writeFile(
        '.postcssrc.json',
        JSON.stringify({
          plugins: {
            './test-plugin.js': {},
          },
        }),
      );
      await harness.writeFile('src/styles.css', '/* base */');
      await harness.writeFile('src/theme.json', '{"color": "aqua"}');

      await harness.executeWithCases(
        [
          async ({ result }) => {
            expect(result?.success).toBe(true);
            harness.expectFile('dist/browser/styles.css').content.toContain('color: aqua');
            harness.expectFile('dist/browser/styles.css').content.not.toContain('color: blue');

            await harness.writeFile('src/theme.json', 'invalid-json');
          },
          async ({ result }) => {
            expect(result?.success).toBe(false);

            await harness.writeFile('src/theme.json', '{"color": "blue"}');
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

    it('rebuilds PostCSS stylesheet after CSS syntax error on initial build from import', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
        styles: ['src/styles.css'],
      });

      await harness.writeFile(
        'noop-plugin.js',
        `
        module.exports = () => ({ postcssPlugin: 'noop-plugin' });
        module.exports.postcss = true;
        `,
      );
      await harness.writeFile(
        '.postcssrc.json',
        JSON.stringify({
          plugins: {
            './noop-plugin.js': {},
          },
        }),
      );
      await harness.writeFile('src/styles.css', "@import './a.css';");
      await harness.writeFile('src/a.css', "a { ' }");

      await harness.executeWithCases(
        [
          async ({ result }) => {
            expect(result?.success).toBe(false);

            await harness.writeFile('src/a.css', 'body { color: aqua; }');
          },
          async ({ result }) => {
            expect(result?.success).toBe(true);
            harness.expectFile('dist/browser/styles.css').content.toContain('color: aqua');
            harness.expectFile('dist/browser/styles.css').content.not.toContain('color: blue');

            await harness.writeFile('src/a.css', 'body { color: blue; }');
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
  });
});
