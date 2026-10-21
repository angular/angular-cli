/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { toPosixPath } from '../../../utils/path';
import { collectAssetsToEmit, createAssetMatchers } from './assets';

describe('library pipeline assets', () => {
  let tempRoot: string;

  beforeEach(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempRoot = toPosixPath(await mkdtemp(path.join(baseTmpDir, 'angular-cli-assets-spec-')));
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  describe('createAssetMatchers', () => {
    it('should normalize patterns, expand directories in ignore, and skip empty strings', () => {
      const matchers = createAssetMatchers([
        {
          glob: './**/*.txt',
          input: `${tempRoot}/assets`,
          output: 'assets',
          ignore: [
            '',
            'ignored-dir',
            './ignored-dir-2/',
            '**/ignored-subdir',
            '{brace-dir-a,brace-dir-b}',
            'specific.txt',
          ],
        },
      ]);

      expect(matchers).toHaveSize(1);
      const [matcher] = matchers;

      expect(matcher.isMatch('keep.txt')).toBeTrue();
      expect(matcher.isMatch('nested/keep.txt')).toBeTrue();
      expect(matcher.isMatch('.hidden.txt')).toBeTrue();
      expect(matcher.isMatch('specific.txt')).toBeFalse();
      expect(matcher.isMatch('ignored-dir/file.txt')).toBeFalse();
      expect(matcher.isMatch('ignored-dir/sub/file.txt')).toBeFalse();
      expect(matcher.isMatch('ignored-dir-2/file.txt')).toBeFalse();
      expect(matcher.isMatch('ignored-subdir/file.txt')).toBeFalse();
      expect(matcher.isMatch('nested/ignored-subdir/file.txt')).toBeFalse();
      expect(matcher.isMatch('nested/ignored-subdir/deep/file.txt')).toBeFalse();
      expect(matcher.isMatch('brace-dir-a/file.txt')).toBeFalse();
      expect(matcher.isMatch('brace-dir-b/sub/file.txt')).toBeFalse();
      expect(matcher.isMatch('.gitkeep')).toBeFalse();
      expect(matcher.isMatch('nested/.DS_Store')).toBeFalse();
    });

    it('should not throw when glob is an empty string', () => {
      const matchers = createAssetMatchers([
        {
          glob: '',
          input: `${tempRoot}/assets`,
          output: 'assets',
        },
      ]);

      expect(matchers).toHaveSize(1);
      expect(matchers[0].isMatch('any.txt')).toBeFalse();
    });
  });

  describe('collectAssetsToEmit', () => {
    it('should deduplicate resolved assets by destination path with later patterns overriding earlier ones', async () => {
      const defaultDir = `${tempRoot}/lib`;
      const customDir = `${tempRoot}/docs`;
      await mkdir(defaultDir, { recursive: true });
      await mkdir(customDir, { recursive: true });

      const defaultReadme = `${defaultDir}/README.md`;
      const customReadme = `${customDir}/README.md`;
      await writeFile(defaultReadme, '# Default');
      await writeFile(customReadme, '# Custom');

      const assets = [
        { glob: 'README.md', input: defaultDir, output: '.' },
        { glob: 'README.md', input: customDir, output: '.' },
      ];

      const initialResult = await collectAssetsToEmit(assets, tempRoot, new Map());
      expect(initialResult.filesToEmit).toEqual([
        {
          origin: 'disk',
          source: customReadme,
          path: 'README.md',
        },
      ]);

      // Watch mode: even if customReadme appears before defaultReadme in modifiedFiles,
      // the later asset pattern (customReadme) should still take precedence.
      const watchResult = await collectAssetsToEmit(
        assets,
        tempRoot,
        new Map(),
        new Set([customReadme, defaultReadme]),
      );
      expect(watchResult.filesToEmit).toEqual([
        {
          origin: 'disk',
          source: customReadme,
          path: 'README.md',
        },
      ]);
    });

    it('should not overwrite a higher-priority emitted asset when only a lower-priority asset is modified in watch mode', async () => {
      const defaultDir = `${tempRoot}/lib`;
      const customDir = `${tempRoot}/docs`;
      await mkdir(defaultDir, { recursive: true });
      await mkdir(customDir, { recursive: true });

      const defaultReadme = `${defaultDir}/README.md`;
      const customReadme = `${customDir}/README.md`;
      await writeFile(defaultReadme, '# Default updated');
      await writeFile(customReadme, '# Custom');

      const assets = [
        { glob: 'README.md', input: defaultDir, output: '.' },
        { glob: 'README.md', input: customDir, output: '.' },
      ];

      // When customReadme was already emitted, modifying defaultReadme should not emit anything.
      const emittedAssets = new Map<string, Set<string>>([[customReadme, new Set(['README.md'])]]);
      const resultWithEmitted = await collectAssetsToEmit(
        assets,
        tempRoot,
        emittedAssets,
        new Set([defaultReadme]),
      );
      expect(resultWithEmitted.filesToEmit).toEqual([]);
      expect(resultWithEmitted.filesToDelete).toEqual([]);

      // When customReadme was not yet recorded in emittedAssets, modifying defaultReadme should emit customReadme.
      const resultWithoutEmitted = await collectAssetsToEmit(
        assets,
        tempRoot,
        new Map(),
        new Set([defaultReadme]),
      );
      expect(resultWithoutEmitted.filesToEmit).toEqual([
        {
          origin: 'disk',
          source: customReadme,
          path: 'README.md',
        },
      ]);

      // When customReadme was recorded in emittedAssets but no longer exists on disk,
      // modifying defaultReadme should queue customReadme for deletion and emit defaultReadme.
      await rm(customReadme);
      const resultWithMissingHigherPriority = await collectAssetsToEmit(
        assets,
        tempRoot,
        emittedAssets,
        new Set([defaultReadme]),
      );
      expect(resultWithMissingHigherPriority.filesToDelete).toEqual([customReadme]);
      expect(resultWithMissingHigherPriority.filesToEmit).toEqual([
        {
          origin: 'disk',
          source: defaultReadme,
          path: 'README.md',
        },
      ]);
    });

    it('should restore a lower-priority fallback asset when a higher-priority overriding asset is deleted in watch mode', async () => {
      const defaultDir = `${tempRoot}/lib`;
      const customDir = `${tempRoot}/docs`;
      await mkdir(defaultDir, { recursive: true });
      await mkdir(customDir, { recursive: true });

      const defaultReadme = `${defaultDir}/README.md`;
      const customReadme = `${customDir}/README.md`;
      await writeFile(defaultReadme, '# Default');

      const assets = [
        { glob: 'README.md', input: defaultDir, output: '.' },
        { glob: 'README.md', input: customDir, output: '.' },
      ];

      // customReadme was previously emitted, and is now deleted from disk while defaultReadme still exists.
      const emittedAssets = new Map<string, Set<string>>([[customReadme, new Set(['README.md'])]]);
      const result = await collectAssetsToEmit(
        assets,
        tempRoot,
        emittedAssets,
        new Set([customReadme]),
      );

      expect(result.filesToDelete).toEqual([customReadme]);
      expect(result.filesToEmit).toEqual([
        {
          origin: 'disk',
          source: defaultReadme,
          path: 'README.md',
        },
      ]);
    });

    it('should respect followSymlinks in watch mode', async () => {
      const assetsDir = `${tempRoot}/assets`;
      await mkdir(assetsDir, { recursive: true });

      const targetFile = `${tempRoot}/external.txt`;
      const symlinkFile = `${assetsDir}/linked.txt`;
      await writeFile(targetFile, 'external');
      await symlink(targetFile, symlinkFile);

      const assetsNoFollow = [
        { glob: '**/*.txt', input: assetsDir, output: 'out', followSymlinks: false },
      ];
      const noFollowResult = await collectAssetsToEmit(
        assetsNoFollow,
        tempRoot,
        new Map(),
        new Set([symlinkFile]),
      );
      expect(noFollowResult.filesToEmit).toEqual([]);

      const assetsFollow = [
        { glob: '**/*.txt', input: assetsDir, output: 'out', followSymlinks: true },
      ];
      const followResult = await collectAssetsToEmit(
        assetsFollow,
        tempRoot,
        new Map(),
        new Set([symlinkFile]),
      );
      expect(followResult.filesToEmit).toEqual([
        {
          origin: 'disk',
          source: symlinkFile,
          path: 'out/linked.txt',
        },
      ]);
    });

    it('should queue nested emitted assets for deletion when a deleted directory is reported in watch mode', async () => {
      const assetsDir = `${tempRoot}/assets`;
      const subDir = `${assetsDir}/sub`;
      const keepDir = `${assetsDir}/keep-dir`;
      await mkdir(keepDir, { recursive: true });

      const nestedFileA = `${subDir}/a.txt`;
      const nestedFileB = `${subDir}/deep/b.txt`;
      const keepFile = `${keepDir}/keep.txt`;
      await writeFile(keepFile, 'keep');

      const emittedAssets = new Map<string, Set<string>>([
        [nestedFileA, new Set(['out/sub/a.txt'])],
        [nestedFileB, new Set(['out/sub/deep/b.txt'])],
        [keepFile, new Set(['out/keep-dir/keep.txt'])],
      ]);

      const assets = [{ glob: '**/*.txt', input: assetsDir, output: 'out' }];

      // subDir does not exist on disk; keepDir still exists on disk
      const result = await collectAssetsToEmit(
        assets,
        tempRoot,
        emittedAssets,
        new Set([subDir, keepDir]),
      );

      expect(result.filesToEmit).toEqual([]);
      expect(result.filesToDelete).toEqual([nestedFileA, nestedFileB]);
    });

    it('should delete nested emitted assets and emit the new file when a directory is replaced by a file at the same path', async () => {
      const assetsDir = `${tempRoot}/assets`;
      await mkdir(assetsDir, { recursive: true });

      const replacedPath = `${assetsDir}/item.txt`;
      const nestedFile = `${replacedPath}/nested.txt`;
      // replacedPath was previously a directory containing nested.txt, and is now a regular file on disk.
      await writeFile(replacedPath, 'now a file');

      const emittedAssets = new Map<string, Set<string>>([
        [nestedFile, new Set(['out/item.txt/nested.txt'])],
      ]);

      const assets = [{ glob: '**/*.txt', input: assetsDir, output: 'out' }];

      const result = await collectAssetsToEmit(
        assets,
        tempRoot,
        emittedAssets,
        new Set([replacedPath]),
      );

      expect(result.filesToDelete).toEqual([nestedFile]);
      expect(result.filesToEmit).toEqual([
        {
          origin: 'disk',
          source: replacedPath,
          path: 'out/item.txt',
        },
      ]);
    });
  });
});
