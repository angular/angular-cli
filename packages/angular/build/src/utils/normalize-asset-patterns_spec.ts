/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path, { join } from 'node:path';
import { normalizeAssetPatterns } from './normalize-asset-patterns';
import { resolveAssets } from './resolve-assets';

describe('normalizeAssetPatterns', () => {
  let tempRoot: string;

  beforeEach(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-assets-test-'));
  });

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('should return an empty array when given no asset patterns', () => {
    expect(normalizeAssetPatterns([], tempRoot, '', 'src')).toEqual([]);
  });

  it('should normalize a string asset within sourceRoot relative to sourceRoot', async () => {
    await mkdir(join(tempRoot, 'src/assets'), { recursive: true });
    await writeFile(join(tempRoot, 'src/assets/logo.png'), 'PNG');

    const result = normalizeAssetPatterns(
      ['src/assets', 'src/assets/logo.png'],
      tempRoot,
      '',
      'src',
    );

    expect(result).toEqual([
      { glob: '**/*', input: 'src/assets', output: 'assets' },
      { glob: 'logo.png', input: 'src/assets', output: 'assets' },
    ]);
  });

  it('should normalize a string asset in a sibling directory sharing a prefix with sourceRoot (e.g. src-assets)', async () => {
    await mkdir(join(tempRoot, 'src-assets'), { recursive: true });
    await writeFile(join(tempRoot, 'src-assets/logo.png'), 'PNG');

    const result = normalizeAssetPatterns(
      ['src-assets', 'src-assets/logo.png'],
      tempRoot,
      '',
      'src',
    );

    expect(result).toEqual([
      { glob: '**/*', input: 'src-assets', output: 'src-assets' },
      { glob: 'logo.png', input: 'src-assets', output: 'src-assets' },
    ]);
  });

  it('should normalize a library string asset in a sibling directory sharing a prefix with projectSourceRoot', async () => {
    await mkdir(join(tempRoot, 'projects/lib/src-assets'), { recursive: true });
    await writeFile(join(tempRoot, 'projects/lib/src-assets/logo.png'), 'PNG');

    const result = normalizeAssetPatterns(
      ['projects/lib/src-assets', 'projects/lib/src-assets/logo.png'],
      tempRoot,
      'projects/lib',
      'projects/lib/src',
    );

    expect(result).toEqual([
      {
        glob: '**/*',
        input: path.normalize('projects/lib/src-assets'),
        output: 'src-assets',
      },
      {
        glob: 'logo.png',
        input: path.normalize('projects/lib/src-assets'),
        output: 'src-assets',
      },
    ]);
  });

  it('should normalize a string asset in a sibling directory sharing a prefix with projectRoot relative to workspaceRoot', async () => {
    await mkdir(join(tempRoot, 'projects/lib-shared'), { recursive: true });
    await writeFile(join(tempRoot, 'projects/lib-shared/logo.png'), 'PNG');

    const result = normalizeAssetPatterns(
      ['projects/lib-shared/logo.png'],
      tempRoot,
      'projects/lib',
      'projects/lib/src',
    );

    expect(result).toEqual([
      {
        glob: 'logo.png',
        input: path.normalize('projects/lib-shared'),
        output: path.normalize('projects/lib-shared'),
      },
    ]);
  });

  it('should throw when a string asset is in a sibling directory sharing a prefix with workspaceRoot', () => {
    const siblingDir = `../${path.basename(tempRoot)}-outside/logo.png`;

    expect(() => normalizeAssetPatterns([siblingDir], tempRoot, '', 'src')).toThrowError(
      /asset path must be within the workspace root/,
    );
  });
});

describe('resolveAssets', () => {
  let tempRoot: string;

  beforeEach(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-resolve-assets-test-'));
  });

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('should ignore both root and nested .gitkeep files by default', async () => {
    await mkdir(join(tempRoot, 'src/assets/nested/deep'), { recursive: true });
    await writeFile(join(tempRoot, 'src/assets/.gitkeep'), '');
    await writeFile(join(tempRoot, 'src/assets/nested/.gitkeep'), '');
    await writeFile(join(tempRoot, 'src/assets/nested/deep/.gitkeep'), '');
    await writeFile(join(tempRoot, 'src/assets/nested/deep/logo.png'), 'PNG');

    const resolved = await resolveAssets(
      [{ glob: '**/*', input: 'src/assets', output: 'assets' }],
      tempRoot,
    );

    expect(resolved).toEqual([
      {
        source: join(tempRoot, 'src/assets/nested/deep/logo.png'),
        destination: join('assets', 'nested/deep/logo.png'),
      },
    ]);
  });

  it('should throw when a resolved destination escapes the output root via ".." in glob', async () => {
    await mkdir(join(tempRoot, 'src'), { recursive: true });
    await writeFile(join(tempRoot, 'outside.txt'), 'secret');

    await expectAsync(
      resolveAssets([{ glob: '../outside.txt', input: 'src', output: '.' }], tempRoot),
    ).toBeRejectedWithError('An asset cannot be written to a location outside of the output path.');

    await expectAsync(
      resolveAssets([{ glob: '../*.txt', input: 'src', output: '.' }], tempRoot),
    ).toBeRejectedWithError('An asset cannot be written to a location outside of the output path.');
  });
});
