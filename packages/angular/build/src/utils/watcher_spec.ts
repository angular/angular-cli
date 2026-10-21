/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type * as ParcelWatcher from '@parcel/watcher';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import {
  type BuildWatcher,
  ChangedFiles,
  ParcelExternalManager,
  createWatcher,
  extractNodeModulesPackageDir,
  getDirectoryPath,
  isPathInside,
  setupWatcher,
  toPosixPathNormalized,
} from './watcher';

describe('Watcher', () => {
  const TMP_DIR = process.env['TEST_TMPDIR'];
  assert(TMP_DIR, 'TEST_TMPDIR must be set');

  describe('toPosixPathNormalized', () => {
    it('should strip trailing slashes for standard directories', () => {
      expect(toPosixPathNormalized('/src/app/')).toBe('/src/app');
      expect(toPosixPathNormalized('C:/src/app/')).toBe('C:/src/app');
    });

    it('should preserve single root slash', () => {
      expect(toPosixPathNormalized('/')).toBe('/');
    });

    it('should preserve trailing slash for Windows drive root', () => {
      expect(toPosixPathNormalized('C:/')).toBe('C:/');
      expect(toPosixPathNormalized('c:/')).toBe('c:/');
    });
  });

  describe('getDirectoryPath', () => {
    it('should return parent directory for POSIX paths', () => {
      expect(getDirectoryPath('/src/app/main.ts')).toBe('/src/app');
      expect(getDirectoryPath('/src/app')).toBe('/src');
      expect(getDirectoryPath('/src')).toBe('/');
      expect(getDirectoryPath('/')).toBe('/');
    });

    it('should correctly handle Windows drive roots', () => {
      expect(getDirectoryPath('C:/src/app/main.ts')).toBe('C:/src/app');
      expect(getDirectoryPath('C:/src')).toBe('C:/');
      expect(getDirectoryPath('C:/')).toBe('C:/');
      expect(getDirectoryPath('c:/')).toBe('c:/');
    });

    it('should return dot for relative paths without slash', () => {
      expect(getDirectoryPath('main.ts')).toBe('.');
    });
  });

  describe('extractNodeModulesPackageDir', () => {
    it('should extract unscoped package directory', () => {
      expect(extractNodeModulesPackageDir('/project/node_modules/my-lib/index.js')).toBe(
        '/project/node_modules/my-lib',
      );
    });

    it('should extract scoped package directory', () => {
      expect(
        extractNodeModulesPackageDir('/project/node_modules/@my-scope/my-lib/src/index.js'),
      ).toBe('/project/node_modules/@my-scope/my-lib');
    });

    it('should handle package directory path directly', () => {
      expect(extractNodeModulesPackageDir('/project/node_modules/my-lib')).toBe(
        '/project/node_modules/my-lib',
      );
    });

    it('should return undefined for paths outside node_modules', () => {
      expect(extractNodeModulesPackageDir('/project/src/main.ts')).toBeUndefined();
    });
  });

  describe('isPathInside', () => {
    it('should return true for a file inside a directory', () => {
      expect(isPathInside('/src/app/main.ts', '/src/app')).toBeTrue();
    });

    it('should return false when file and dir are identical', () => {
      expect(isPathInside('/src/app', '/src/app')).toBeFalse();
    });

    it('should return false for sibling directories with matching prefix', () => {
      expect(isPathInside('/src/app-other/main.ts', '/src/app')).toBeFalse();
    });

    it('should handle Windows drive letters on the same drive', () => {
      expect(isPathInside('c:/src/app/main.ts', 'c:/src/app')).toBeTrue();
    });

    it('should return false for Windows drive letters on different drives', () => {
      expect(isPathInside('d:/src/app/main.ts', 'c:/src/app')).toBeFalse();
    });

    it('should handle root directory correctly', () => {
      expect(isPathInside('/src/main.ts', '/')).toBeTrue();
    });

    it('should handle Windows drive root directory correctly', () => {
      expect(isPathInside('c:/src/main.ts', 'c:/')).toBeTrue();
    });
  });

  describe('ChangedFiles', () => {
    it('should track added, modified, and removed files', () => {
      const changes = new ChangedFiles();
      changes.added.add('/src/app.component.ts');
      changes.modified.add('/src/main.ts');
      changes.removed.add('/src/old.ts');

      expect(changes.all).toEqual(['/src/app.component.ts', '/src/main.ts', '/src/old.ts']);
    });

    it('should deduplicate files present in multiple sets in .all', () => {
      const changes = new ChangedFiles();
      changes.added.add('/src/main.ts');
      changes.modified.add('/src/main.ts');

      expect(changes.all).toEqual(['/src/main.ts']);
    });

    it('should format debug string correctly', () => {
      const changes = new ChangedFiles();
      changes.modified.add('/src/main.ts');

      const debug = JSON.parse(changes.toDebugString());
      expect(debug).toEqual({
        added: [],
        modified: ['/src/main.ts'],
        removed: [],
      });
    });
  });

  describe('setupWatcher', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(TMP_DIR, 'setup-watcher-spec-'));
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should setup watcher with watchFiles and close on abort signal', async () => {
      const abortController = new AbortController();
      const testFile = path.join(tempDir, 'main.ts');
      const watcher = await setupWatcher({
        workspaceRoot: tempDir,
        projectRoot: tempDir,
        outputPath: path.join(tempDir, 'dist'),
        cacheOptions: { basePath: path.join(tempDir, '.cache') },
        watchFiles: [testFile],
        signal: abortController.signal,
      });

      expect(watcher).toBeDefined();

      const closeSpy = spyOn(watcher, 'close').and.callThrough();
      abortController.abort();

      expect(closeSpy).toHaveBeenCalled();
      await watcher.close();
    });

    it('should remove abort listener when watcher is closed', async () => {
      const abortController = new AbortController();
      const removeSpy = spyOn(abortController.signal, 'removeEventListener').and.callThrough();
      const watcher = await setupWatcher({
        workspaceRoot: tempDir,
        projectRoot: tempDir,
        outputPath: path.join(tempDir, 'dist'),
        cacheOptions: { basePath: path.join(tempDir, '.cache') },
        signal: abortController.signal,
      });

      await watcher.close();
      expect(removeSpy).toHaveBeenCalledWith('abort', jasmine.any(Function));
    });

    it('should setup watcher with preserveSymlinks: true and detect changes in linked package in node_modules', async () => {
      const externalDir = fs.mkdtempSync(path.join(TMP_DIR, 'setup-watcher-npm-link-'));

      try {
        const externalTargetFile = path.join(externalDir, 'index.ts');
        fs.writeFileSync(externalTargetFile, 'export const a = 1;');

        const nodeModulesDir = path.join(tempDir, 'node_modules');
        fs.mkdirSync(nodeModulesDir);

        const linkedPkgDir = path.join(nodeModulesDir, 'linked-pkg');
        fs.symlinkSync(externalDir, linkedPkgDir, 'junction');
        const linkedFile = path.join(linkedPkgDir, 'index.ts');

        const watcher = await setupWatcher({
          workspaceRoot: tempDir,
          projectRoot: tempDir,
          outputPath: path.join(tempDir, 'dist'),
          cacheOptions: { basePath: path.join(tempDir, '.cache') },
          preserveSymlinks: true,
          watchFiles: [linkedFile],
        });

        await setTimeout(250);

        const iterator = watcher[Symbol.asyncIterator]();
        const nextPromise = iterator.next();

        fs.writeFileSync(externalTargetFile, 'export const a = 2;');

        const result = await nextPromise;
        expect(result.done).toBeFalsy();
        expect(result.value?.all.some((f: string) => f.includes('linked-pkg'))).toBeTrue();

        await watcher.close();
      } finally {
        fs.rmSync(externalDir, { recursive: true, force: true });
      }
    }, 10000);
  });

  describe('createWatcher', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(TMP_DIR, 'watcher-spec-'));
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should instantiate and close watcher without error', async () => {
      const watcher = await createWatcher({ cwd: tempDir });
      expect(watcher).toBeDefined();

      watcher.add(path.join(tempDir, 'main.ts'));
      watcher.remove(path.join(tempDir, 'main.ts'));

      await watcher.close();
    });

    it('should support array of paths in add and remove', async () => {
      const watcher = await createWatcher({ cwd: tempDir });
      const file1 = path.join(tempDir, 'a.ts');
      const file2 = path.join(tempDir, 'b.ts');

      watcher.add([file1, file2]);
      watcher.remove([file1, file2]);

      await watcher.close();
    });

    it('should support polling option', async () => {
      const watcher = await createWatcher({ polling: true, interval: 100, cwd: tempDir });
      expect(watcher).toBeDefined();

      watcher.add(path.join(tempDir, 'main.ts'));
      await watcher.close();
    });

    it('should emit changes when a watched file is modified (chokidar polling)', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'initial');

      const watcher = await createWatcher({ polling: true, interval: 50, cwd: tempDir });
      watcher.add(testFile);

      // Wait a short moment for watcher setup and mtime tick
      await setTimeout(100);

      const iterator = watcher[Symbol.asyncIterator]();
      const nextPromise = iterator.next();

      // Trigger change
      fs.writeFileSync(testFile, 'updated');

      const result = await nextPromise;
      expect(result.done).toBeFalsy();
      expect(result.value?.all.length).toBeGreaterThan(0);

      await watcher.close();
    }, 10000);

    it('should preserve original path character casing in emitted changes', async () => {
      const casedFile = path.join(tempDir, 'App.Component.ts');
      fs.writeFileSync(casedFile, 'initial');

      const watcher = await createWatcher({ polling: true, interval: 50, cwd: tempDir });
      watcher.add(casedFile);

      await setTimeout(100);

      const iterator = watcher[Symbol.asyncIterator]();
      const nextPromise = iterator.next();

      fs.writeFileSync(casedFile, 'updated');

      const result = await nextPromise;
      expect(result.done).toBeFalsy();
      const emittedFiles = result.value?.all ?? [];
      expect(emittedFiles.some((f: string) => f.includes('App.Component.ts'))).toBeTrue();

      await watcher.close();
    }, 10000);

    it('should emit changes when watching a directory containing modified files', async () => {
      const subDir = path.join(tempDir, 'sub');
      fs.mkdirSync(subDir);
      const testFile = path.join(subDir, 'nested.txt');
      fs.writeFileSync(testFile, 'initial');

      const watcher = await createWatcher({ polling: true, interval: 50, cwd: tempDir });
      watcher.add(subDir);

      await setTimeout(100);

      const iterator = watcher[Symbol.asyncIterator]();
      const nextPromise = iterator.next();

      fs.writeFileSync(testFile, 'updated');

      const result = await nextPromise;
      expect(result.done).toBeFalsy();
      expect(result.value?.all.length).toBeGreaterThan(0);

      await watcher.close();
    }, 10000);

    it('should support watching paths outside cwd', async () => {
      const externalDir = fs.mkdtempSync(path.join(TMP_DIR, 'external-watcher-spec-'));
      const externalFile = path.join(externalDir, 'external.txt');
      fs.writeFileSync(externalFile, 'initial');

      try {
        const watcher = await createWatcher({ polling: true, interval: 50, cwd: tempDir });
        watcher.add(externalFile);

        await setTimeout(100);

        const iterator = watcher[Symbol.asyncIterator]();
        const nextPromise = iterator.next();

        fs.writeFileSync(externalFile, 'updated');

        const result = await nextPromise;
        expect(result.done).toBeFalsy();
        expect(result.value?.all.some((f: string) => f.includes('external.txt'))).toBeTrue();

        await watcher.close();
      } finally {
        fs.rmSync(externalDir, { recursive: true, force: true });
      }
    }, 10000);

    it('should handle adding multiple external files in the same directory concurrently', async () => {
      const externalDir = fs.mkdtempSync(path.join(TMP_DIR, 'external-watcher-spec-'));
      const file1 = path.join(externalDir, 'file1.txt');
      const file2 = path.join(externalDir, 'file2.txt');
      fs.writeFileSync(file1, 'initial1');
      fs.writeFileSync(file2, 'initial2');

      try {
        const watcher = await createWatcher({ polling: true, interval: 50, cwd: tempDir });
        watcher.add([file1, file2]);

        await setTimeout(100);

        const iterator = watcher[Symbol.asyncIterator]();
        let nextPromise = iterator.next();
        fs.writeFileSync(file1, 'updated1');
        let result = await nextPromise;
        expect(result.value?.all.some((f: string) => f.includes('file1.txt'))).toBeTrue();

        nextPromise = iterator.next();
        fs.writeFileSync(file2, 'updated2');
        result = await nextPromise;
        expect(result.value?.all.some((f: string) => f.includes('file2.txt'))).toBeTrue();

        await watcher.close();
      } finally {
        fs.rmSync(externalDir, { recursive: true, force: true });
      }
    }, 10000);

    it('should clean up external subscriptions when all external files in a directory are removed', async () => {
      const externalDir = fs.mkdtempSync(path.join(TMP_DIR, 'external-watcher-spec-'));
      const file1 = path.join(externalDir, 'file1.txt');
      const file2 = path.join(externalDir, 'file2.txt');
      fs.writeFileSync(file1, 'initial1');
      fs.writeFileSync(file2, 'initial2');

      try {
        const watcher = await createWatcher({ polling: true, interval: 50, cwd: tempDir });
        watcher.add([file1, file2]);

        await setTimeout(100);

        // Remove files from watcher
        watcher.remove(file1);
        watcher.remove(file2);

        await watcher.close();
      } finally {
        fs.rmSync(externalDir, { recursive: true, force: true });
      }
    });

    it('should handle nested external directories without creating duplicate subscriptions', async () => {
      const externalDir = fs.mkdtempSync(path.join(TMP_DIR, 'external-watcher-spec-'));
      const subDir = path.join(externalDir, 'sub');
      fs.mkdirSync(subDir);
      const parentFile = path.join(externalDir, 'parent.txt');
      const childFile = path.join(subDir, 'child.txt');
      fs.writeFileSync(parentFile, 'initial-parent');
      fs.writeFileSync(childFile, 'initial-child');

      try {
        const watcher = await createWatcher({ polling: true, interval: 50, cwd: tempDir });
        watcher.add(parentFile);
        watcher.add(childFile);

        await setTimeout(100);

        const iterator = watcher[Symbol.asyncIterator]();
        const nextPromise = iterator.next();

        fs.writeFileSync(childFile, 'updated-child');

        const result = await nextPromise;
        expect(result.done).toBeFalsy();
        expect(result.value?.all.some((f: string) => f.includes('child.txt'))).toBeTrue();

        await watcher.close();
      } finally {
        fs.rmSync(externalDir, { recursive: true, force: true });
      }
    }, 10000);

    it('should subscribe to subsumed external child directory when parent external subscription is removed', async () => {
      const externalDir = fs.mkdtempSync(path.join(TMP_DIR, 'external-watcher-spec-'));
      const subDir = path.join(externalDir, 'sub');
      fs.mkdirSync(subDir);
      const parentFile = path.join(externalDir, 'parent.txt');
      const childFile = path.join(subDir, 'child.txt');
      fs.writeFileSync(parentFile, 'initial-parent');
      fs.writeFileSync(childFile, 'initial-child');

      try {
        const watcher = await createWatcher({ polling: true, interval: 50, cwd: tempDir });
        watcher.add(parentFile);
        watcher.add(childFile);

        await setTimeout(100);

        watcher.remove(parentFile);

        await setTimeout(100);

        const iterator = watcher[Symbol.asyncIterator]();
        const nextPromise = iterator.next();

        fs.writeFileSync(childFile, 'updated-child');

        const result = await nextPromise;
        expect(result.done).toBeFalsy();
        expect(result.value?.all.some((f: string) => f.includes('child.txt'))).toBeTrue();

        await watcher.close();
      } finally {
        fs.rmSync(externalDir, { recursive: true, force: true });
      }
    }, 10000);

    it('should signal completion on close', async () => {
      const watcher = await createWatcher({ polling: true, interval: 50, cwd: tempDir });
      const iterator = watcher[Symbol.asyncIterator]();

      const nextPromise = iterator.next();
      await watcher.close();

      const result = await nextPromise;
      expect(result.done).toBeTrue();
    });

    it('should return done immediately if next() is called after close()', async () => {
      const watcher = await createWatcher({ polling: true, interval: 50, cwd: tempDir });
      await watcher.close();

      const result = await watcher.next();
      expect(result.done).toBeTrue();
    });

    it('should not throw if add() or remove() is called after close()', async () => {
      const watcher = await createWatcher({ polling: true, interval: 50, cwd: tempDir });
      await watcher.close();

      expect(() => watcher.add(path.join(tempDir, 'main.ts'))).not.toThrow();
      expect(() => watcher.remove(path.join(tempDir, 'main.ts'))).not.toThrow();
    });

    it('should ignore stale modifications before initTime and emit changes after initTime (@parcel/watcher)', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'initial');

      // Small delay to ensure initial mtimeMs is strictly earlier than initTime - 1000
      await setTimeout(1100);

      // Create native @parcel/watcher (polling: false / default)
      const watcher = await createWatcher({ cwd: tempDir });
      watcher.add(testFile);

      // Wait a short moment for native watcher setup and kernel event stream initialization
      await setTimeout(150);

      const iterator = watcher[Symbol.asyncIterator]();
      const nextPromise = iterator.next();

      // Trigger a change after watcher initialization
      fs.writeFileSync(testFile, 'updated');

      const result = await nextPromise;
      expect(result.done).toBeFalsy();
      expect(result.value?.all.some((f: string) => f.includes('test.txt'))).toBeTrue();

      await watcher.close();
    }, 10000);

    it('should emit changes when a file is deleted and recreated with stabilization delay (@parcel/watcher)', async () => {
      const testFile = path.join(tempDir, 'recreate.txt');
      fs.writeFileSync(testFile, 'initial');

      await setTimeout(50);

      const watcher = await createWatcher({ cwd: tempDir });
      watcher.add(testFile);

      await setTimeout(150);

      const iterator = watcher[Symbol.asyncIterator]();

      // Delete the file
      fs.rmSync(testFile);
      let result = await iterator.next();
      expect(result.done).toBeFalsy();
      expect(result.value?.removed.size).toBeGreaterThan(0);

      // Brief stabilization delay before recreating to prevent macOS fsevents kernel driver
      // from coalescing unlink and create into a single directory event
      await setTimeout(150);

      // Recreate the file
      fs.writeFileSync(testFile, 'recreated');
      result = await iterator.next();
      expect(result.done).toBeFalsy();
      expect(result.value?.added.size).toBeGreaterThan(0);

      await watcher.close();
    }, 10000);

    it('should ignore changes matching glob patterns in polling mode (chokidar)', async () => {
      const ignoredDir = path.join(tempDir, 'dist');
      fs.mkdirSync(ignoredDir);
      const ignoredFile = path.join(ignoredDir, 'bundle.js');
      const watchedFile = path.join(tempDir, 'src.ts');
      fs.writeFileSync(ignoredFile, 'initial-dist');
      fs.writeFileSync(watchedFile, 'initial-src');

      const watcher = await createWatcher({
        polling: true,
        interval: 50,
        cwd: tempDir,
        ignored: [`${toPosixPathNormalized(ignoredDir)}/**`],
      });

      watcher.add(tempDir);
      await setTimeout(100);

      const iterator = watcher[Symbol.asyncIterator]();
      const nextPromise = iterator.next();

      // Trigger changes in ignored file and watched file
      fs.writeFileSync(ignoredFile, 'updated-dist');
      fs.writeFileSync(watchedFile, 'updated-src');

      const result = await nextPromise;
      expect(result.done).toBeFalsy();
      const emitted = result.value?.all ?? [];
      expect(emitted.some((f: string) => f.includes('src.ts'))).toBeTrue();
      expect(emitted.some((f: string) => f.includes('bundle.js'))).toBeFalse();

      await watcher.close();
    }, 10000);

    it('should detect changes behind a directory symlink when followSymlinks is true', async () => {
      const externalDir = fs.mkdtempSync(path.join(TMP_DIR, 'watcher-external-'));
      let watcher: BuildWatcher | undefined;

      try {
        const externalTargetFile = path.join(externalDir, 'index.ts');
        fs.writeFileSync(externalTargetFile, 'export const a = 1;');

        const symlinkDir = path.join(tempDir, 'symlinked-lib');
        fs.symlinkSync(externalDir, symlinkDir, 'junction');

        const symlinkedFile = path.join(symlinkDir, 'index.ts');

        watcher = await createWatcher({
          followSymlinks: true,
          cwd: tempDir,
        });

        watcher.add(symlinkedFile);
        await setTimeout(250);

        const iterator = watcher[Symbol.asyncIterator]();
        const nextPromise = iterator.next();

        fs.writeFileSync(externalTargetFile, 'export const a = 2;');

        const result = await nextPromise;
        expect(result.done).toBeFalsy();
        expect(result.value?.all.some((f: string) => f.includes('index.ts'))).toBeTrue();
      } finally {
        await watcher?.close();
        fs.rmSync(externalDir, { recursive: true, force: true });
      }
    }, 10000);

    it('should detect changes in linked package in node_modules while ignoring unimported packages', async () => {
      const externalDir = fs.mkdtempSync(path.join(TMP_DIR, 'watcher-npm-link-'));
      let watcher: BuildWatcher | undefined;

      try {
        const externalTargetFile = path.join(externalDir, 'index.ts');
        fs.writeFileSync(externalTargetFile, 'export const a = 1;');

        const nodeModulesDir = path.join(tempDir, 'node_modules');
        fs.mkdirSync(nodeModulesDir);

        // Unimported package that should be ignored
        const unimportedPkgDir = path.join(nodeModulesDir, 'unimported-pkg');
        fs.mkdirSync(unimportedPkgDir);
        const unimportedFile = path.join(unimportedPkgDir, 'dep.ts');
        fs.writeFileSync(unimportedFile, 'export const dep = 1;');

        // Linked package in node_modules
        const linkedPkgDir = path.join(nodeModulesDir, 'linked-pkg');
        fs.symlinkSync(externalDir, linkedPkgDir, 'junction');
        const linkedFile = path.join(linkedPkgDir, 'index.ts');

        watcher = await createWatcher({
          followSymlinks: true,
          cwd: tempDir,
        });

        watcher.add(linkedFile);
        await setTimeout(250);

        const iterator = watcher[Symbol.asyncIterator]();
        const nextPromise = iterator.next();

        // Modify both the linked file and the unimported file
        fs.writeFileSync(unimportedFile, 'export const dep = 2;');
        fs.writeFileSync(externalTargetFile, 'export const a = 2;');

        const result = await nextPromise;
        expect(result.done).toBeFalsy();
        const changed = result.value?.all ?? [];
        expect(changed.some((f: string) => f.includes('linked-pkg'))).toBeTrue();
        expect(changed.some((f: string) => f.includes('unimported-pkg'))).toBeFalse();
      } finally {
        await watcher?.close();
        fs.rmSync(externalDir, { recursive: true, force: true });
      }
    }, 10000);

    it('should detect changes in scoped linked package in node_modules', async () => {
      const externalDir = fs.mkdtempSync(path.join(TMP_DIR, 'watcher-scoped-npm-link-'));
      let watcher: BuildWatcher | undefined;

      try {
        const externalTargetFile = path.join(externalDir, 'index.ts');
        fs.writeFileSync(externalTargetFile, 'export const a = 1;');

        const nodeModulesDir = path.join(tempDir, 'node_modules');
        const scopeDir = path.join(nodeModulesDir, '@my-scope');
        fs.mkdirSync(scopeDir, { recursive: true });

        // Unimported package in scope
        const unimportedScopedDir = path.join(scopeDir, 'unimported-scoped');
        fs.mkdirSync(unimportedScopedDir);
        const unimportedFile = path.join(unimportedScopedDir, 'dep.ts');
        fs.writeFileSync(unimportedFile, 'export const dep = 1;');

        // Linked scoped package in node_modules
        const linkedPkgDir = path.join(scopeDir, 'linked-pkg');
        fs.symlinkSync(externalDir, linkedPkgDir, 'junction');
        const linkedFile = path.join(linkedPkgDir, 'index.ts');

        watcher = await createWatcher({
          followSymlinks: true,
          cwd: tempDir,
        });

        watcher.add(linkedFile);
        await setTimeout(250);

        const iterator = watcher[Symbol.asyncIterator]();
        const nextPromise = iterator.next();

        fs.writeFileSync(unimportedFile, 'export const dep = 2;');
        fs.writeFileSync(externalTargetFile, 'export const a = 2;');

        const result = await nextPromise;
        expect(result.done).toBeFalsy();
        const changed = result.value?.all ?? [];
        expect(changed.some((f: string) => f.includes('linked-pkg'))).toBeTrue();
        expect(changed.some((f: string) => f.includes('unimported-scoped'))).toBeFalse();
      } finally {
        await watcher?.close();
        fs.rmSync(externalDir, { recursive: true, force: true });
      }
    }, 10000);

    it('should detect changes in linked package added dynamically via watcher.add', async () => {
      const externalDir = fs.mkdtempSync(path.join(TMP_DIR, 'watcher-dynamic-npm-link-'));
      let watcher: BuildWatcher | undefined;

      try {
        const externalTargetFile = path.join(externalDir, 'index.ts');
        fs.writeFileSync(externalTargetFile, 'export const a = 1;');

        const nodeModulesDir = path.join(tempDir, 'node_modules');
        fs.mkdirSync(nodeModulesDir);

        const linkedPkgDir = path.join(nodeModulesDir, 'linked-pkg');
        fs.symlinkSync(externalDir, linkedPkgDir, 'junction');
        const linkedFile = path.join(linkedPkgDir, 'index.ts');

        // Initially create watcher with no watchFiles
        watcher = await createWatcher({
          followSymlinks: true,
          cwd: tempDir,
        });

        // Add linked file dynamically after watcher creation
        watcher.add(linkedFile);
        await setTimeout(250);

        const iterator = watcher[Symbol.asyncIterator]();
        const nextPromise = iterator.next();

        fs.writeFileSync(externalTargetFile, 'export const a = 2;');

        const result = await nextPromise;
        expect(result.done).toBeFalsy();
        expect(result.value?.all.some((f: string) => f.includes('linked-pkg'))).toBeTrue();
      } finally {
        await watcher?.close();
        fs.rmSync(externalDir, { recursive: true, force: true });
      }
    }, 10000);

    it('should unwatch linked package file when removed via watcher.remove', async () => {
      const externalDir = fs.mkdtempSync(path.join(TMP_DIR, 'watcher-remove-npm-link-'));
      let watcher: BuildWatcher | undefined;

      try {
        const externalTargetFile = path.join(externalDir, 'index.ts');
        fs.writeFileSync(externalTargetFile, 'export const a = 1;');

        const nodeModulesDir = path.join(tempDir, 'node_modules');
        fs.mkdirSync(nodeModulesDir);

        const linkedPkgDir = path.join(nodeModulesDir, 'linked-pkg');
        fs.symlinkSync(externalDir, linkedPkgDir, 'junction');
        const linkedFile = path.join(linkedPkgDir, 'index.ts');

        const regularFile = path.join(tempDir, 'main.ts');
        fs.writeFileSync(regularFile, 'export const main = 1;');

        watcher = await createWatcher({
          followSymlinks: true,
          cwd: tempDir,
        });

        watcher.add([linkedFile, regularFile]);
        // Allow a brief moment for Chokidar to register the new watch paths
        await setTimeout(250);

        const iterator = watcher[Symbol.asyncIterator]();

        // Verify changes in the linked package are detected initially
        let nextPromise = iterator.next();
        fs.writeFileSync(externalTargetFile, 'export const a = 2;');
        let result = await nextPromise;
        expect(result.done).toBeFalsy();
        expect(result.value?.all.some((f: string) => f.includes('linked-pkg'))).toBeTrue();

        // Remove the linked file from the watcher
        watcher.remove(linkedFile);
        // Allow a brief moment for Chokidar to asynchronously complete unwatching the file
        await setTimeout(250);

        // Modify both the removed linked file and the regular file
        nextPromise = iterator.next();
        fs.writeFileSync(externalTargetFile, 'export const a = 3;');
        fs.writeFileSync(regularFile, 'export const main = 2;');

        result = await nextPromise;
        expect(result.done).toBeFalsy();
        const changed = result.value?.all ?? [];
        expect(changed.some((f: string) => f.includes('main.ts'))).toBeTrue();
        expect(changed.some((f: string) => f.includes('linked-pkg'))).toBeFalse();
      } finally {
        await watcher?.close();
        fs.rmSync(externalDir, { recursive: true, force: true });
      }
    }, 10000);

    it('should detect changes across multiple external directories when using @parcel/watcher', async () => {
      const externalRoot = fs.mkdtempSync(path.join(TMP_DIR, 'parcel-external-spec-'));
      let watcher: BuildWatcher | undefined;

      try {
        const lib1Dir = path.join(externalRoot, 'libs', 'lib-1', 'src');
        const lib2Dir = path.join(externalRoot, 'libs', 'lib-2', 'src');
        fs.mkdirSync(lib1Dir, { recursive: true });
        fs.mkdirSync(lib2Dir, { recursive: true });

        const file1 = path.join(lib1Dir, 'index.ts');
        const file2 = path.join(lib2Dir, 'index.ts');
        fs.writeFileSync(file1, 'export const a = 1;');
        fs.writeFileSync(file2, 'export const b = 1;');

        // Backdate initial file timestamps to earlier than `initTime - 1000` so that any
        // delayed initial FSEvents replay from file creation is ignored by the watcher.
        const pastTime = new Date(Date.now() - 5000);
        fs.utimesSync(file1, pastTime, pastTime);
        fs.utimesSync(file2, pastTime, pastTime);

        watcher = await createWatcher({ cwd: tempDir });
        watcher.add([file1, file2]);

        await setTimeout(150);

        const iterator = watcher[Symbol.asyncIterator]();

        let nextPromise = iterator.next();
        fs.writeFileSync(file1, 'export const a = 2;');
        let result = await nextPromise;
        expect(result.done).toBeFalsy();
        expect(result.value?.all.some((f: string) => f.includes('lib-1'))).toBeTrue();

        nextPromise = iterator.next();
        fs.writeFileSync(file2, 'export const b = 2;');
        result = await nextPromise;
        expect(result.done).toBeFalsy();
        expect(result.value?.all.some((f: string) => f.includes('lib-2'))).toBeTrue();
      } finally {
        await watcher?.close();
        fs.rmSync(externalRoot, { recursive: true, force: true });
      }
    }, 10000);

    it('should detect file deletion and recreation when watching multiple files with followSymlinks: true', async () => {
      const subDirA = path.join(tempDir, 'dir-a');
      const subDirB = path.join(tempDir, 'dir-b');
      fs.mkdirSync(subDirA);
      fs.mkdirSync(subDirB);

      const fileA = path.join(subDirA, 'a.ts');
      const fileB = path.join(subDirB, 'b.ts');
      fs.writeFileSync(fileA, 'export const a = 1;');
      fs.writeFileSync(fileB, 'export const b = 1;');

      const watcher = await createWatcher({
        followSymlinks: true,
        cwd: tempDir,
      });

      try {
        watcher.add([fileA, fileB]);
        await setTimeout(250);

        const iterator = watcher[Symbol.asyncIterator]();

        // Delete fileA and wait past Chokidar's atomic write window
        fs.rmSync(fileA);
        let result = await iterator.next();
        expect(result.done).toBeFalsy();
        expect(result.value?.removed.size).toBeGreaterThan(0);

        await setTimeout(150);

        // Recreate fileA and verify the watcher still detects it
        fs.writeFileSync(fileA, 'export const a = 2;');
        result = await iterator.next();
        expect(result.done).toBeFalsy();
        expect(result.value?.all.some((f: string) => f.includes('a.ts'))).toBeTrue();

        // Modify recreated fileA again to ensure ongoing changes are tracked
        await setTimeout(150);
        fs.writeFileSync(fileA, 'export const a = 3;');
        result = await iterator.next();
        expect(result.done).toBeFalsy();
        expect(result.value?.all.some((f: string) => f.includes('a.ts'))).toBeTrue();
      } finally {
        await watcher.close();
      }
    }, 10000);

    it('should prune node_modules when watching root directory while watching added package files', async () => {
      const nodeModulesDir = path.join(tempDir, 'node_modules');
      const pkgDir = path.join(nodeModulesDir, 'some-pkg');
      fs.mkdirSync(pkgDir, { recursive: true });

      const watchedPkgFile = path.join(pkgDir, 'index.js');
      const unwatchedPkgFile = path.join(pkgDir, 'other.js');
      const rootFile = path.join(tempDir, 'main.ts');
      fs.writeFileSync(watchedPkgFile, 'export const idx = 1;');
      fs.writeFileSync(unwatchedPkgFile, 'export const other = 1;');
      fs.writeFileSync(rootFile, 'export const main = 1;');

      const pastTime = new Date(Date.now() - 5000);
      fs.utimesSync(watchedPkgFile, pastTime, pastTime);
      fs.utimesSync(unwatchedPkgFile, pastTime, pastTime);
      fs.utimesSync(rootFile, pastTime, pastTime);

      const watcher = await createWatcher({
        followSymlinks: true,
        cwd: tempDir,
      });

      try {
        // Watch both the root directory and a specific file in node_modules
        watcher.add([tempDir, watchedPkgFile]);
        await setTimeout(250);

        const iterator = watcher[Symbol.asyncIterator]();
        const nextPromise = iterator.next();

        // Modify unwatched file in node_modules (should be ignored even though tempDir is watched)
        // and watched file in node_modules
        fs.writeFileSync(unwatchedPkgFile, 'export const other = 2;');
        fs.writeFileSync(watchedPkgFile, 'export const idx = 2;');

        const result = await nextPromise;
        expect(result.done).toBeFalsy();
        const changed = result.value?.all ?? [];
        expect(changed.some((f: string) => f.includes('index.js'))).toBeTrue();
        expect(changed.some((f: string) => f.includes('other.js'))).toBeFalse();
      } finally {
        await watcher.close();
      }
    }, 10000);
  });

  describe('ParcelExternalManager', () => {
    function createMockParcelWatcher(options?: {
      failAfter?: number;
      onSubscribe?: (dir: string, opts?: ParcelWatcher.Options) => void;
    }) {
      const activeDirs = new Set<string>();
      const subscribeHistory: { dir: string; options?: ParcelWatcher.Options }[] = [];
      let totalCalls = 0;

      const mockWatcher = {
        subscribe: jasmine
          .createSpy('subscribe')
          .and.callFake(
            async (
              dir: string,
              _cb: ParcelWatcher.SubscribeCallback,
              opts?: ParcelWatcher.Options,
            ): Promise<ParcelWatcher.AsyncSubscription> => {
              totalCalls++;
              options?.onSubscribe?.(dir, opts);
              if (options?.failAfter !== undefined && activeDirs.size >= options.failAfter) {
                throw new Error('Error starting FSEvents stream');
              }
              activeDirs.add(dir);
              subscribeHistory.push({ dir, options: opts });

              return {
                unsubscribe: async () => {
                  activeDirs.delete(dir);
                },
              };
            },
          ),
      } as unknown as typeof ParcelWatcher;

      return {
        mockWatcher,
        activeDirs,
        subscribeHistory,
        getTotalCalls: () => totalCalls,
      };
    }

    it('should batch synchronous watchFile calls and subsume child directories added before parent', async () => {
      const { mockWatcher, activeDirs, getTotalCalls } = createMockParcelWatcher();
      const manager = new ParcelExternalManager(
        mockWatcher,
        undefined,
        '/monorepo/apps/app',
        '/monorepo/apps/app',
        true,
        () => {},
      );

      // Add deeper child directories first, then their parent directory in the same synchronous turn
      manager.watchFile(
        '/monorepo/libs/lib-1/src/components/button/button.ts',
        '/monorepo/libs/lib-1/src/components/button/button.ts',
      );
      manager.watchFile(
        '/monorepo/libs/lib-1/src/components/card/card.ts',
        '/monorepo/libs/lib-1/src/components/card/card.ts',
      );
      manager.watchFile('/monorepo/libs/lib-1/src/index.ts', '/monorepo/libs/lib-1/src/index.ts');

      await manager.flush();

      // Should only ever have subscribed once to the parent '/monorepo/libs/lib-1/src'
      expect(getTotalCalls()).toBe(1);
      expect(Array.from(activeDirs)).toEqual(['/monorepo/libs/lib-1/src']);

      await manager.close();
    });

    it('should normalize external node_modules paths to their package root directory', async () => {
      const { mockWatcher, activeDirs, getTotalCalls } = createMockParcelWatcher();
      const manager = new ParcelExternalManager(
        mockWatcher,
        undefined,
        '/monorepo/apps/app',
        '/monorepo/apps/app',
        true,
        () => {},
      );

      manager.watchFile(
        '/monorepo/node_modules/my-pkg/fesm2022/my-pkg.mjs',
        '/monorepo/node_modules/my-pkg/fesm2022/my-pkg.mjs',
      );
      manager.watchFile(
        '/monorepo/node_modules/my-pkg/esm2022/sub/helper.mjs',
        '/monorepo/node_modules/my-pkg/esm2022/sub/helper.mjs',
      );
      manager.watchFile(
        '/monorepo/node_modules/@scope/scoped-pkg/fesm2022/index.mjs',
        '/monorepo/node_modules/@scope/scoped-pkg/fesm2022/index.mjs',
      );
      manager.watchFile(
        '/monorepo/node_modules/@scope/scoped-pkg/package.json',
        '/monorepo/node_modules/@scope/scoped-pkg/package.json',
      );

      await manager.flush();

      expect(getTotalCalls()).toBe(2);
      expect(Array.from(activeDirs).sort()).toEqual([
        '/monorepo/node_modules/@scope/scoped-pkg',
        '/monorepo/node_modules/my-pkg',
      ]);

      // Removing one file from my-pkg should keep the package subscription active
      manager.removeFile('/monorepo/node_modules/my-pkg/fesm2022/my-pkg.mjs');
      await manager.flush();
      expect(activeDirs.has('/monorepo/node_modules/my-pkg')).toBeTrue();

      // Removing the last file from my-pkg should unsubscribe the package directory
      manager.removeFile('/monorepo/node_modules/my-pkg/esm2022/sub/helper.mjs');
      await manager.flush();
      expect(activeDirs.has('/monorepo/node_modules/my-pkg')).toBeFalse();
      expect(Array.from(activeDirs)).toEqual(['/monorepo/node_modules/@scope/scoped-pkg']);

      await manager.close();
    });

    it('should coalesce large numbers of external library and node_modules directories into common ancestors within budget', async () => {
      const { mockWatcher, activeDirs, getTotalCalls } = createMockParcelWatcher();
      const manager = new ParcelExternalManager(
        mockWatcher,
        undefined,
        '/monorepo/apps/app',
        '/monorepo/apps/app',
        true,
        () => {},
        64,
      );

      // Simulate 600 sibling libraries and 200 hoisted node_modules packages (800 external dirs)
      for (let i = 0; i < 600; i++) {
        const file = `/monorepo/libs/lib-${i}/src/index.ts`;
        manager.watchFile(file, file);
      }
      for (let i = 0; i < 200; i++) {
        const file = `/monorepo/node_modules/pkg-${i}/dist/index.mjs`;
        manager.watchFile(file, file);
      }

      await manager.flush();

      // All 600 libs coalesce into '/monorepo/libs' and all 200 packages coalesce into '/monorepo/node_modules'
      expect(getTotalCalls()).toBe(2);
      expect(Array.from(activeDirs).sort()).toEqual(['/monorepo/libs', '/monorepo/node_modules']);

      await manager.close();
    });

    it('should prioritize collapsing deeper branching subdirectories before broader ancestor directories', async () => {
      const { mockWatcher, activeDirs } = createMockParcelWatcher();
      const manager = new ParcelExternalManager(
        mockWatcher,
        undefined,
        '/monorepo/apps/app',
        '/monorepo/apps/app',
        true,
        () => {},
        3, // Budget of 3 subscriptions
      );

      // lib-1 has 4 component subdirectories, lib-2 and lib-3 have 1 each (total = 6 leaf dirs)
      for (let c = 1; c <= 4; c++) {
        const file = `/monorepo/libs/lib-1/src/comp-${c}/comp.ts`;
        manager.watchFile(file, file);
      }
      manager.watchFile('/monorepo/libs/lib-2/src/index.ts', '/monorepo/libs/lib-2/src/index.ts');
      manager.watchFile('/monorepo/libs/lib-3/src/index.ts', '/monorepo/libs/lib-3/src/index.ts');

      await manager.flush();

      // Collapsing lib-1/src reduces total leaves from 6 to 3, meeting the budget of 3
      // without needing to collapse all of '/monorepo/libs'
      expect(Array.from(activeDirs).sort()).toEqual([
        '/monorepo/libs/lib-1/src',
        '/monorepo/libs/lib-2/src',
        '/monorepo/libs/lib-3/src',
      ]);

      await manager.close();
    });

    it('should ignore workspaceRoot when coalescing into an ancestor of workspaceRoot (Tier 2)', async () => {
      const { mockWatcher, activeDirs, subscribeHistory } = createMockParcelWatcher();
      const manager = new ParcelExternalManager(
        mockWatcher,
        { ignored: ['/monorepo/apps/app/dist'] },
        '/monorepo/apps/app',
        '/monorepo/apps/app',
        true,
        () => {},
        2, // Budget of 2 subscriptions
      );

      // Sibling apps/packages directly under /monorepo/apps (which is an ancestor of /monorepo/apps/app)
      manager.watchFile(
        '/monorepo/apps/shared-1/src/index.ts',
        '/monorepo/apps/shared-1/src/index.ts',
      );
      manager.watchFile(
        '/monorepo/apps/shared-2/src/index.ts',
        '/monorepo/apps/shared-2/src/index.ts',
      );
      manager.watchFile(
        '/monorepo/apps/shared-3/src/index.ts',
        '/monorepo/apps/shared-3/src/index.ts',
      );

      await manager.flush();

      expect(Array.from(activeDirs)).toEqual(['/monorepo/apps']);
      expect(subscribeHistory.length).toBe(1);
      expect(subscribeHistory[0].options?.ignore).toEqual([
        '/monorepo/apps/app/dist',
        '/monorepo/apps/app',
        '/monorepo/apps/app/**',
      ]);

      await manager.close();
    });

    it('should dynamically lower budget and coalesce into ancestor when subscribe fails with FSEvents stream limit error', async () => {
      const externalRoot = fs.mkdtempSync(path.join(TMP_DIR, 'parcel-fallback-spec-'));

      try {
        const rootPosix = toPosixPathNormalized(path.join(externalRoot, 'apps', 'app'));
        const libFiles: string[] = [];
        for (let i = 0; i < 6; i++) {
          const libDir = path.join(externalRoot, 'libs', `lib-${i}`, 'src');
          fs.mkdirSync(libDir, { recursive: true });
          const file = toPosixPathNormalized(path.join(libDir, 'index.ts'));
          fs.writeFileSync(file, 'export const x = 1;');
          libFiles.push(file);
        }

        // Allow at most 2 active FSEvents streams even though manager budget starts at 64
        const { mockWatcher, activeDirs } = createMockParcelWatcher({ failAfter: 2 });
        const manager = new ParcelExternalManager(
          mockWatcher,
          undefined,
          rootPosix,
          rootPosix,
          true,
          () => {},
          64,
        );

        for (const file of libFiles) {
          manager.watchFile(file, file);
        }

        await manager.flush();

        // Should have shrunk and coalesced the 6 libraries into the single '/libs' ancestor directory
        const expectedLibsDir = toPosixPathNormalized(path.join(externalRoot, 'libs'));
        expect(Array.from(activeDirs)).toEqual([expectedLibsDir]);

        await manager.close();
      } finally {
        fs.rmSync(externalRoot, { recursive: true, force: true });
      }
    });

    it('should uncoalesce and subscribe to remaining leaf directories when removals bring count back within budget', async () => {
      const { mockWatcher, activeDirs } = createMockParcelWatcher();
      const manager = new ParcelExternalManager(
        mockWatcher,
        undefined,
        '/monorepo/apps/app',
        '/monorepo/apps/app',
        true,
        () => {},
        2, // Budget of 2 subscriptions
      );

      const file1 = '/monorepo/libs/lib-1/src/index.ts';
      const file2 = '/monorepo/libs/lib-2/src/index.ts';
      const file3 = '/monorepo/libs/lib-3/src/index.ts';

      manager.watchFile(file1, file1);
      manager.watchFile(file2, file2);
      manager.watchFile(file3, file3);

      await manager.flush();

      // 3 directories exceed budget of 2, so they coalesce into '/monorepo/libs'
      expect(Array.from(activeDirs)).toEqual(['/monorepo/libs']);

      // Removing file3 brings remaining directories to 2, which fits within budget
      manager.removeFile(file3);
      await manager.flush();

      expect(Array.from(activeDirs).sort()).toEqual([
        '/monorepo/libs/lib-1/src',
        '/monorepo/libs/lib-2/src',
      ]);

      // Removing the remaining files unsubscribes everything
      manager.removeFile(file1);
      manager.removeFile(file2);
      await manager.flush();

      expect(activeDirs.size).toBe(0);

      await manager.close();
    });
  });
});
