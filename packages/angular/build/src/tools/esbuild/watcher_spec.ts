/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import {
  ChangedFiles,
  createWatcher,
  getDirectoryPath,
  isPathInside,
  toPosixPathNormalized,
} from './watcher';

describe('Watcher', () => {
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

  describe('createWatcher', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'watcher-spec-')));
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
      const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-watcher-spec-'));
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
      const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-watcher-spec-'));
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
      const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-watcher-spec-'));
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
      const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-watcher-spec-'));
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
      const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-watcher-spec-'));
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
  });
});
