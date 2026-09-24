/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import {
  type BuildWatcher,
  ChangedFiles,
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

    it('should unwatch linked package directory when all its files are removed via watcher.remove', async () => {
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
        // Allow a brief moment for Chokidar to asynchronously complete unwatching the package directory
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
  });
});
