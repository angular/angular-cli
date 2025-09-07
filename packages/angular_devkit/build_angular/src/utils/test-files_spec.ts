/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { glob as realGlob } from 'tinyglobby';
import { findTestFiles } from './test-files';

describe('test-files', () => {
  describe('findTestFiles()', () => {
    let tempDir!: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp('angular-cli-jest-builder-test-files-');
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true });
    });

    it('returns all the test files in the project', async () => {
      await fs.writeFile(path.join(tempDir, 'foo.spec.ts'), '');
      await fs.mkdir(path.join(tempDir, 'nested'));
      await fs.writeFile(path.join(tempDir, 'nested', 'bar.spec.ts'), '');

      const testFiles = await findTestFiles(
        ['**/*.spec.ts'] /* include */,
        [] /* exclude */,
        tempDir,
      );

      expect(testFiles).toEqual(new Set(['foo.spec.ts', path.join('nested', 'bar.spec.ts')]));
    });

    it('excludes `node_modules/` and files from input options', async () => {
      await fs.writeFile(path.join(tempDir, 'foo.spec.ts'), '');
      await fs.writeFile(path.join(tempDir, 'bar.ignored.spec.ts'), '');
      await fs.mkdir(path.join(tempDir, 'node_modules', 'dep'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'node_modules', 'dep', 'baz.spec.ts'), '');

      const testFiles = await findTestFiles(
        ['**/*.spec.ts'] /* include */,
        ['**/*.ignored.spec.ts'] /* exclude */,
        tempDir,
      );

      expect(testFiles).toEqual(new Set(['foo.spec.ts']));
    });

    it('finds files in multiple globs', async () => {
      await fs.writeFile(path.join(tempDir, 'foo.spec.ts'), '');
      await fs.writeFile(path.join(tempDir, 'bar.test.ts'), '');
      await fs.writeFile(path.join(tempDir, 'foo.ignored.spec.ts'), '');
      await fs.writeFile(path.join(tempDir, 'bar.ignored.test.ts'), '');

      await fs.mkdir(path.join(tempDir, 'node_modules', 'dep'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'node_modules', 'dep', 'baz.spec.ts'), '');
      await fs.writeFile(path.join(tempDir, 'node_modules', 'dep', 'baz.test.ts'), '');

      const testFiles = await findTestFiles(
        ['**/*.spec.ts', '**/*.test.ts'] /* include */,
        // Exclude should be applied to all `glob()` executions.
        ['**/*.ignored.*.ts'] /* exclude */,
        tempDir,
      );

      expect(testFiles).toEqual(new Set(['foo.spec.ts', 'bar.test.ts']));
    });

    it('is constrained to the workspace root', async () => {
      await fs.mkdir(path.join(tempDir, 'nested'));
      await fs.writeFile(path.join(tempDir, 'foo.spec.ts'), '');
      await fs.writeFile(path.join(tempDir, 'nested', 'bar.spec.ts'), '');

      const testFiles = await findTestFiles(
        ['**/*.spec.ts'] /* include */,
        [] /* exclude */,
        path.join(tempDir, 'nested'),
      );

      expect(testFiles).toEqual(new Set(['bar.spec.ts']));
    });

    it('throws if any `glob` invocation fails', async () => {
      const err = new Error('Eww, I stepped in a glob.');
      const glob = jasmine
        .createSpy('glob', realGlob)
        .and.returnValues(
          Promise.resolve(['foo.spec.ts']),
          Promise.reject(err),
          Promise.resolve(['bar.test.ts']),
        );

      await expectAsync(
        findTestFiles(
          ['*.spec.ts', '*.stuff.ts', '*.test.ts'] /* include */,
          [] /* exclude */,
          tempDir,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          glob as any,
        ),
      ).toBeRejectedWith(err);
    });

    it('disables brace expansion', async () => {
      await fs.writeFile(path.join(tempDir, 'foo.spec.ts'), '');
      await fs.writeFile(path.join(tempDir, 'bar.spec.ts'), '');

      const testFiles = await findTestFiles(
        ['{foo,bar}.spec.ts'] /* include */,
        [] /* exclude */,
        tempDir,
      );

      expect(testFiles).toEqual(new Set());
    });

    it('disables `extglob` features', async () => {
      await fs.writeFile(path.join(tempDir, 'foo.spec.ts'), '');
      await fs.writeFile(path.join(tempDir, 'bar.spec.ts'), '');

      const testFiles = await findTestFiles(
        ['+(foo|bar).spec.ts'] /* include */,
        [] /* exclude */,
        tempDir,
      );

      expect(testFiles).toEqual(new Set());
    });

    it('ignores directories', async () => {
      await fs.mkdir(path.join(tempDir, 'foo.spec.ts'));
      await fs.mkdir(path.join(tempDir, 'bar.spec.ts'));
      await fs.writeFile(path.join(tempDir, 'bar.spec.ts', 'baz.spec.ts'), '');

      const testFiles = await findTestFiles(
        ['**/*.spec.ts'] /* include */,
        [] /* exclude */,
        tempDir,
      );

      expect(testFiles).toEqual(new Set([path.join('bar.spec.ts', 'baz.spec.ts')]));
    });
  });
});
