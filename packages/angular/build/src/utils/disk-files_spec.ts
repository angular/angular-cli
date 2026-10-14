/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type EmittableFile, deleteFilesFromDisk, emitFilesToDisk } from './disk-files';

describe('disk-files', () => {
  let tempRoot: string;

  beforeEach(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-disk-files-test-'));
  });

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  describe('emitFilesToDisk', () => {
    it('should write memory files and copy disk files while creating nested directories', async () => {
      const sourceFile = join(tempRoot, 'source-asset.txt');
      await writeFile(sourceFile, 'from-disk');

      const files: (EmittableFile & { path: string })[] = [
        {
          origin: 'memory',
          path: 'nested/a/mem1.txt',
          contents: new TextEncoder().encode('mem-1'),
        },
        { origin: 'memory', path: 'nested/a/mem2.txt', contents: 'mem-2' },
        { origin: 'disk', path: 'nested/b/disk1.txt', source: sourceFile },
        { origin: 'disk', path: 'nested/c/disk2.txt', source: sourceFile },
        { origin: 'memory', path: 'skipped/file.txt', contents: 'should-not-exist' },
      ];

      const outDir = join(tempRoot, 'out');
      await emitFilesToDisk(files, (file) =>
        file.path.startsWith('skipped/') ? undefined : join(outDir, file.path),
      );

      expect(await readFile(join(outDir, 'nested/a/mem1.txt'), 'utf-8')).toBe('mem-1');
      expect(await readFile(join(outDir, 'nested/a/mem2.txt'), 'utf-8')).toBe('mem-2');
      expect(await readFile(join(outDir, 'nested/b/disk1.txt'), 'utf-8')).toBe('from-disk');
      expect(await readFile(join(outDir, 'nested/c/disk2.txt'), 'utf-8')).toBe('from-disk');
      expect(existsSync(join(outDir, 'skipped/file.txt'))).toBeFalse();
    });
  });

  describe('deleteFilesFromDisk', () => {
    it('should delete existing files and ignore non-existent files', async () => {
      const fileA = join(tempRoot, 'a.txt');
      const fileB = join(tempRoot, 'b.txt');
      const nonExistent = join(tempRoot, 'missing.txt');

      await writeFile(fileA, 'a');
      await writeFile(fileB, 'b');

      await deleteFilesFromDisk([fileA, nonExistent]);

      expect(existsSync(fileA)).toBeFalse();
      expect(existsSync(fileB)).toBeTrue();
    });
  });
});
