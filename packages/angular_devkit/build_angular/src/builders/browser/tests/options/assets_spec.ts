/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Option: "assets"', () => {
    beforeEach(async () => {
      // Application code is not needed for asset tests
      await harness.writeFile('src/main.ts', '');
    });

    it('supports an empty array value', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: [],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
    });

    it('supports mixing shorthand and longhand syntax', async () => {
      await harness.writeFile('src/files/test.svg', '<svg></svg>');
      await harness.writeFile('src/files/another.file', 'asset file');
      await harness.writeFile('src/extra.file', 'extra file');

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        assets: ['src/extra.file', { glob: '*', input: 'src/files', output: '.' }],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);

      harness.expectFile('dist/extra.file').content.toBe('extra file');
      harness.expectFile('dist/test.svg').content.toBe('<svg></svg>');
      harness.expectFile('dist/another.file').content.toBe('asset file');
    });

    describe('shorthand syntax', () => {
      it('copies a single asset', async () => {
        await harness.writeFile('src/test.svg', '<svg></svg>');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: ['src/test.svg'],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').content.toBe('<svg></svg>');
      });

      it('copies multiple assets', async () => {
        await harness.writeFile('src/test.svg', '<svg></svg>');
        await harness.writeFile('src/another.file', 'asset file');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: ['src/test.svg', 'src/another.file'],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').content.toBe('<svg></svg>');
        harness.expectFile('dist/another.file').content.toBe('asset file');
      });

      it('copies an asset with directory and maintains directory in output', async () => {
        await harness.writeFile('src/subdirectory/test.svg', '<svg></svg>');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: ['src/subdirectory/test.svg'],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/subdirectory/test.svg').content.toBe('<svg></svg>');
      });

      it('does not fail if asset does not exist', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: ['src/test.svg'],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').toNotExist();
      });

      it('fail if asset path is not within project source root', async () => {
        await harness.writeFile('test.svg', '<svg></svg>');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: ['test.svg'],
        });

        const { result } = await harness.executeOnce();

        expect(result?.error).toMatch('path must start with the project source root');

        harness.expectFile('dist/test.svg').toNotExist();
      });
    });

    describe('longhand syntax', () => {
      it('copies a single asset', async () => {
        await harness.writeFile('src/test.svg', '<svg></svg>');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: 'test.svg', input: 'src', output: '.' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').content.toBe('<svg></svg>');
      });

      it('copies multiple assets as separate entries', async () => {
        await harness.writeFile('src/test.svg', '<svg></svg>');
        await harness.writeFile('src/another.file', 'asset file');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [
            { glob: 'test.svg', input: 'src', output: '.' },
            { glob: 'another.file', input: 'src', output: '.' },
          ],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').content.toBe('<svg></svg>');
        harness.expectFile('dist/another.file').content.toBe('asset file');
      });

      it('copies multiple assets with a single entry glob pattern', async () => {
        await harness.writeFile('src/test.svg', '<svg></svg>');
        await harness.writeFile('src/another.file', 'asset file');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: '{test.svg,another.file}', input: 'src', output: '.' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').content.toBe('<svg></svg>');
        harness.expectFile('dist/another.file').content.toBe('asset file');
      });

      it('copies multiple assets with a wildcard glob pattern', async () => {
        await harness.writeFile('src/files/test.svg', '<svg></svg>');
        await harness.writeFile('src/files/another.file', 'asset file');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: '*', input: 'src/files', output: '.' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').content.toBe('<svg></svg>');
        harness.expectFile('dist/another.file').content.toBe('asset file');
      });

      it('copies multiple assets with a recursive wildcard glob pattern', async () => {
        await harness.writeFiles({
          'src/files/test.svg': '<svg></svg>',
          'src/files/another.file': 'asset file',
          'src/files/nested/extra.file': 'extra file',
        });

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: '**/*', input: 'src/files', output: '.' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').content.toBe('<svg></svg>');
        harness.expectFile('dist/another.file').content.toBe('asset file');
        harness.expectFile('dist/nested/extra.file').content.toBe('extra file');
      });

      it('automatically ignores "." prefixed files when using wildcard glob pattern', async () => {
        await harness.writeFile('src/files/.gitkeep', '');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: '*', input: 'src/files', output: '.' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/.gitkeep').toNotExist();
      });

      it('supports ignoring a specific file when using a glob pattern', async () => {
        await harness.writeFiles({
          'src/files/test.svg': '<svg></svg>',
          'src/files/another.file': 'asset file',
          'src/files/nested/extra.file': 'extra file',
        });

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: '**/*', input: 'src/files', output: '.', ignore: ['another.file'] }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').content.toBe('<svg></svg>');
        harness.expectFile('dist/another.file').toNotExist();
        harness.expectFile('dist/nested/extra.file').content.toBe('extra file');
      });

      it('supports ignoring with a glob pattern when using a glob pattern', async () => {
        await harness.writeFiles({
          'src/files/test.svg': '<svg></svg>',
          'src/files/another.file': 'asset file',
          'src/files/nested/extra.file': 'extra file',
        });

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: '**/*', input: 'src/files', output: '.', ignore: ['**/*.file'] }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').content.toBe('<svg></svg>');
        harness.expectFile('dist/another.file').toNotExist();
        harness.expectFile('dist/nested/extra.file').toNotExist();
      });

      it('copies an asset with directory and maintains directory in output', async () => {
        await harness.writeFile('src/subdirectory/test.svg', '<svg></svg>');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: 'subdirectory/test.svg', input: 'src', output: '.' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/subdirectory/test.svg').content.toBe('<svg></svg>');
      });

      it('does not fail if asset does not exist', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: 'test.svg', input: 'src', output: '.' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').toNotExist();
      });

      it('uses project output path when output option is empty string', async () => {
        await harness.writeFile('src/test.svg', '<svg></svg>');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: 'test.svg', input: 'src', output: '' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').content.toBe('<svg></svg>');
      });

      it('uses project output path when output option is "."', async () => {
        await harness.writeFile('src/test.svg', '<svg></svg>');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: 'test.svg', input: 'src', output: '.' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').content.toBe('<svg></svg>');
      });

      it('uses project output path when output option is "/"', async () => {
        await harness.writeFile('src/test.svg', '<svg></svg>');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: 'test.svg', input: 'src', output: '/' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/test.svg').content.toBe('<svg></svg>');
      });

      it('creates a project output sub-path when output option path does not exist', async () => {
        await harness.writeFile('src/test.svg', '<svg></svg>');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: 'test.svg', input: 'src', output: 'subdirectory' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);

        harness.expectFile('dist/subdirectory/test.svg').content.toBe('<svg></svg>');
      });

      it('fails if asset input option is outside workspace root (relative)', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: '**/*', input: '../outside', output: '.' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.error).toMatch('asset path must be within the workspace root');
      });

      it('fails if asset input option is outside workspace root (absolute)', async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: '**/*', input: '/tmp/outside-workspace', output: '.' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.error).toMatch('asset path must be within the workspace root');
      });

      it('fails if output option is not within project output path', async () => {
        await harness.writeFile('test.svg', '<svg></svg>');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [{ glob: 'test.svg', input: 'src', output: '..' }],
        });

        const { result } = await harness.executeOnce();

        expect(result?.error).toMatch(
          'An asset cannot be written to a location outside of the output path',
        );

        harness.expectFile('dist/test.svg').toNotExist();
      });
    });

    describe('symlinks and monorepo external assets', () => {
      let externalDir: string;

      beforeEach(async () => {
        const baseTmpDir = process.env['TEST_TMPDIR'];
        assert(baseTmpDir, 'TEST_TMPDIR must be set');
        externalDir = await fs.mkdtemp(path.join(baseTmpDir, 'angular-cli-asset-test-'));
        await fs.mkdir(path.join(externalDir, 'nested'), { recursive: true });
        await fs.writeFile(path.join(externalDir, 'shared-root.txt'), 'shared root asset');
        await fs.writeFile(
          path.join(externalDir, 'nested', 'shared-nested.txt'),
          'shared nested asset',
        );
      });

      afterEach(async () => {
        await fs.rm(externalDir, { recursive: true, force: true });
      });

      it('copies assets from a symlinked directory outside workspace root with followSymlinks: true', async () => {
        const symlinkPath = harness.resolvePath('src/shared-assets');
        await fs.symlink(externalDir, symlinkPath, 'junction');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: [
            { glob: '**/*', input: 'src/shared-assets', output: 'assets', followSymlinks: true },
          ],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);
        harness.expectFile('dist/assets/shared-root.txt').content.toBe('shared root asset');
        harness
          .expectFile('dist/assets/nested/shared-nested.txt')
          .content.toBe('shared nested asset');
      });

      it('copies a symlinked file pointing outside the workspace root', async () => {
        const symlinkPath = harness.resolvePath('src/external-file.txt');
        await fs.symlink(path.join(externalDir, 'shared-root.txt'), symlinkPath, 'file');

        harness.useTarget('build', {
          ...BASE_OPTIONS,
          assets: ['src/external-file.txt'],
        });

        const { result } = await harness.executeOnce();

        expect(result?.success).toBe(true);
        harness.expectFile('dist/external-file.txt').content.toBe('shared root asset');
      });
    });
  });
});
