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
  describe('Option: "styles"', () => {
    beforeEach(async () => {
      // Application code is not needed for styles tests
      await harness.writeFile('src/main.ts', '');
    });

    it('supports an empty array value', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: [],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/styles.css').toNotExist();
    });

    it('does not create an output styles file when option is not present', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/styles.css').toNotExist();
    });

    describe('shorthand syntax', () => {
      it('processes a single style into a single output', async () => {
        await harness.writeFile('src/test-style-a.css', '.test-a {color: red}');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: ['src/test-style-a.css'],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/styles.css').content.toContain('.test-a {color: red}');
        harness
          .expectFile('dist/index.html')
          .content.toContain('<link rel="stylesheet" href="styles.css">');
      });

      it('processes multiple styles into a single output', async () => {
        await harness.writeFiles({
          'src/test-style-a.css': '.test-a {color: red}',
          'src/test-style-b.css': '.test-b {color: green}',
        });

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: ['src/test-style-a.css', 'src/test-style-b.css'],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/styles.css').content.toContain('.test-a {color: red}');
        harness.expectFile('dist/styles.css').content.toContain('.test-b {color: green}');
        harness
          .expectFile('dist/index.html')
          .content.toContain('<link rel="stylesheet" href="styles.css">');
      });

      it('preserves order of multiple styles in single output', async () => {
        await harness.writeFiles({
          'src/test-style-a.css': '.test-a {color: red}',
          'src/test-style-b.css': '.test-b {color: green}',
          'src/test-style-c.css': '.test-c {color: blue}',
          'src/test-style-d.css': '.test-d {color: yellow}',
        });

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [
            'src/test-style-c.css',
            'src/test-style-d.css',
            'src/test-style-b.css',
            'src/test-style-a.css',
          ],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness
          .expectFile('dist/styles.css')
          .content.toMatch(
            /\.test-c {color: blue}[\s|\S]+\.test-d {color: yellow}[\s|\S]+\.test-b {color: green}[\s|\S]+\.test-a {color: red}/m,
          );
      });

      it('fails and shows an error if style does not exist', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: ['src/test-style-a.css'],
        });

        const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });

        expect(result?.success).toBeFalse();
        expect(logs).toContain(
          jasmine.objectContaining({ message: jasmine.stringMatching('Module not found:') }),
        );

        harness.expectFile('dist/styles.css').toNotExist();
      });

      it('shows the output style as a chunk entry in the logging output', async () => {
        await harness.writeFile('src/test-style-a.css', '.test-a {color: red}');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: ['src/test-style-a.css'],
        });

        const { result, logs } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        expect(logs).toContain(
          jasmine.objectContaining({ message: jasmine.stringMatching(/styles\.css.+\d+ bytes/) }),
        );
      });
    });

    describe('longhand syntax', () => {
      it('processes a single style into a single output', async () => {
        await harness.writeFile('src/test-style-a.css', '.test-a {color: red}');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [{ input: 'src/test-style-a.css' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/styles.css').content.toContain('.test-a {color: red}');
        harness
          .expectFile('dist/index.html')
          .content.toContain('<link rel="stylesheet" href="styles.css">');
      });

      it('processes a single style into a single output named with bundleName', async () => {
        await harness.writeFile('src/test-style-a.css', '.test-a {color: red}');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [{ input: 'src/test-style-a.css', bundleName: 'extra' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/extra.css').content.toContain('.test-a {color: red}');
        harness
          .expectFile('dist/index.html')
          .content.toContain('<link rel="stylesheet" href="extra.css">');
      });

      it('uses default bundleName when bundleName is empty string', async () => {
        await harness.writeFile('src/test-style-a.css', '.test-a {color: red}');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [{ input: 'src/test-style-a.css', bundleName: '' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/styles.css').content.toContain('.test-a {color: red}');
        harness
          .expectFile('dist/index.html')
          .content.toContain('<link rel="stylesheet" href="styles.css">');
      });

      it('processes multiple styles with no bundleName into a single output', async () => {
        await harness.writeFiles({
          'src/test-style-a.css': '.test-a {color: red}',
          'src/test-style-b.css': '.test-b {color: green}',
        });

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [{ input: 'src/test-style-a.css' }, { input: 'src/test-style-b.css' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/styles.css').content.toContain('.test-a {color: red}');
        harness.expectFile('dist/styles.css').content.toContain('.test-b {color: green}');
        harness
          .expectFile('dist/index.html')
          .content.toContain('<link rel="stylesheet" href="styles.css">');
      });

      it('processes multiple styles with same bundleName into a single output', async () => {
        await harness.writeFiles({
          'src/test-style-a.css': '.test-a {color: red}',
          'src/test-style-b.css': '.test-b {color: green}',
        });

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [
            { input: 'src/test-style-a.css', bundleName: 'extra' },
            { input: 'src/test-style-b.css', bundleName: 'extra' },
          ],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/extra.css').content.toContain('.test-a {color: red}');
        harness.expectFile('dist/extra.css').content.toContain('.test-b {color: green}');
        harness
          .expectFile('dist/index.html')
          .content.toContain('<link rel="stylesheet" href="extra.css">');
      });

      it('processes multiple styles with different bundleNames into separate outputs', async () => {
        await harness.writeFiles({
          'src/test-style-a.css': '.test-a {color: red}',
          'src/test-style-b.css': '.test-b {color: green}',
        });

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [
            { input: 'src/test-style-a.css', bundleName: 'extra' },
            { input: 'src/test-style-b.css', bundleName: 'other' },
          ],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/extra.css').content.toContain('.test-a {color: red}');
        harness.expectFile('dist/other.css').content.toContain('.test-b {color: green}');
        harness
          .expectFile('dist/index.html')
          .content.toContain('<link rel="stylesheet" href="extra.css">');
        harness
          .expectFile('dist/index.html')
          .content.toContain('<link rel="stylesheet" href="other.css">');
      });

      it('preserves order of multiple styles in single output', async () => {
        await harness.writeFiles({
          'src/test-style-a.css': '.test-a {color: red}',
          'src/test-style-b.css': '.test-b {color: green}',
          'src/test-style-c.css': '.test-c {color: blue}',
          'src/test-style-d.css': '.test-d {color: yellow}',
        });

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [
            { input: 'src/test-style-c.css' },
            { input: 'src/test-style-d.css' },
            { input: 'src/test-style-b.css' },
            { input: 'src/test-style-a.css' },
          ],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness
          .expectFile('dist/styles.css')
          .content.toMatch(
            /\.test-c {color: blue}[\s|\S]+\.test-d {color: yellow}[\s|\S]+\.test-b {color: green}[\s|\S]+\.test-a {color: red}/,
          );
      });

      it('preserves order of multiple styles with different bundleNames', async () => {
        await harness.writeFiles({
          'src/test-style-a.css': '.test-a {color: red}',
          'src/test-style-b.css': '.test-b {color: green}',
          'src/test-style-c.css': '.test-c {color: blue}',
          'src/test-style-d.css': '.test-d {color: yellow}',
        });

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [
            { input: 'src/test-style-c.css', bundleName: 'other' },
            { input: 'src/test-style-d.css', bundleName: 'extra' },
            { input: 'src/test-style-b.css', bundleName: 'extra' },
            { input: 'src/test-style-a.css', bundleName: 'other' },
          ],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness
          .expectFile('dist/other.css')
          .content.toMatch(/\.test-c {color: blue}[\s|\S]+\.test-a {color: red}/);
        harness
          .expectFile('dist/extra.css')
          .content.toMatch(/\.test-d {color: yellow}[\s|\S]+\.test-b {color: green}/);
        harness
          .expectFile('dist/index.html')
          .content.toMatch(
            /<link rel="stylesheet" href="other.css">\s*<link rel="stylesheet" href="extra.css">/,
          );
      });

      it('adds link element to index when inject is true', async () => {
        await harness.writeFile('src/test-style-a.css', '.test-a {color: red}');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [{ input: 'src/test-style-a.css', inject: true }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/styles.css').content.toContain('.test-a {color: red}');
        harness
          .expectFile('dist/index.html')
          .content.toContain('<link rel="stylesheet" href="styles.css">');
      });

      it('does not add link element to index when inject is false', async () => {
        await harness.writeFile('src/test-style-a.css', '.test-a {color: red}');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [{ input: 'src/test-style-a.css', inject: false }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        // `inject: false` causes the bundleName to be the input file name
        harness.expectFile('dist/test-style-a.css').content.toContain('.test-a {color: red}');
        harness
          .expectFile('dist/index.html')
          .content.not.toContain('<link rel="stylesheet" href="test-style-a.css">');
      });

      it('does not add link element to index with bundleName when inject is false', async () => {
        await harness.writeFile('src/test-style-a.css', '.test-a {color: red}');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [{ input: 'src/test-style-a.css', bundleName: 'extra', inject: false }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/extra.css').content.toContain('.test-a {color: red}');
        harness
          .expectFile('dist/index.html')
          .content.not.toContain('<link rel="stylesheet" href="extra.css">');
      });

      it('shows the output style as a chunk entry in the logging output', async () => {
        await harness.writeFile('src/test-style-a.css', '.test-a {color: red}');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [{ input: 'src/test-style-a.css' }],
        });

        const { result, logs } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        expect(logs).toContain(
          jasmine.objectContaining({ message: jasmine.stringMatching(/styles\.css.+\d+ bytes/) }),
        );
      });

      it('shows the output style as a chunk entry with bundleName in the logging output', async () => {
        await harness.writeFile('src/test-style-a.css', '.test-a {color: red}');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          styles: [{ input: 'src/test-style-a.css', bundleName: 'extra' }],
        });

        const { result, logs } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        expect(logs).toContain(
          jasmine.objectContaining({ message: jasmine.stringMatching(/extra\.css.+\d+ bytes/) }),
        );
      });
    });
  });
});
