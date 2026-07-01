/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { mkdir, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deleteOutputDir } from './delete-output-dir';

describe('deleteOutputDir', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ng-test-'));
  });

  it('should throw when output path is the project root', async () => {
    await expectAsync(deleteOutputDir(root, '.')).toBeRejectedWithError(
      /MUST not be the workspace root directory/,
    );
  });

  it('should throw when output path is a parent of the project root', async () => {
    await expectAsync(deleteOutputDir(root, '..')).toBeRejectedWithError(
      /MUST not be a parent of the workspace root directory/,
    );
  });

  it('should throw when output path is a grandparent of the project root', async () => {
    await expectAsync(deleteOutputDir(root, '../..')).toBeRejectedWithError(
      /MUST not be a parent of the workspace root directory/,
    );
  });

  it('should not throw when output path is a child of the project root', async () => {
    const outputDir = join(root, 'dist');
    await mkdir(outputDir, { recursive: true });
    await writeFile(join(outputDir, 'old-file.txt'), 'content');

    await expectAsync(deleteOutputDir(root, 'dist')).toBeResolved();
  });

  it('should delete contents of a valid output directory', async () => {
    const outputDir = join(root, 'dist');
    await mkdir(outputDir, { recursive: true });
    await writeFile(join(outputDir, 'old-file.txt'), 'content');

    await deleteOutputDir(root, 'dist');

    const entries = await readdir(outputDir);
    expect(entries.length).toBe(0);
  });

  it('should not throw when output directory does not exist', async () => {
    await expectAsync(deleteOutputDir(root, 'nonexistent')).toBeResolved();
  });

  it('should not throw when output path is an absolute path outside the project', async () => {
    const externalDir = await mkdtemp(join(tmpdir(), 'ng-test-external-'));
    await writeFile(join(externalDir, 'old-file.txt'), 'content');

    await expectAsync(deleteOutputDir(root, externalDir)).toBeResolved();
  });
});
