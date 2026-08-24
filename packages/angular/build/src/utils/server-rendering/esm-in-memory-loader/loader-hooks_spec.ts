/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { initialize, load, resolve } from './loader-hooks';
import { createSharedServerFiles } from './utils';

describe('esm-in-memory-loader loader-hooks', () => {
  const workspaceRoot = '/mock/workspace/root';
  const sharedFiles = createSharedServerFiles({
    'main.server.mjs': 'export const main = true;',
    'chunk-abc.mjs': 'export const chunk = "abc";',
    'nested/chunk-sub.mjs': 'export const sub = "sub";',
    'utf8.mjs': 'export const text = "🔥 UTF-8 🚀";',
    'empty.mjs': '',
  });

  beforeEach(() => {
    initialize({
      workspaceRoot,
      outputFiles: sharedFiles,
    });
  });

  describe('resolve', () => {
    it('should resolve memory:// URLs into virtual filesystem URLs', () => {
      const nextResolve = jasmine.createSpy('nextResolve');
      const memoryUrl = new URL('./main.server.mjs', 'memory://').href;
      const result = resolve(memoryUrl, { parentURL: undefined }, nextResolve);

      expect(nextResolve).not.toHaveBeenCalled();
      expect(result.format).toBe('module');
      expect(result.shortCircuit).toBeTrue();
      expect(result.url).toContain('/.angular/prerender-root/');
      expect(result.url).toContain('/main.server.mjs');
    });

    it('should fail when memory:// URL is malformed', () => {
      const nextResolve = jasmine.createSpy('nextResolve');
      expect(() => {
        resolve('memory://::invalid', { parentURL: undefined }, nextResolve);
      }).toThrowMatching((err: Error) =>
        err.message.includes('External code attempted to use malformed memory scheme'),
      );
      expect(nextResolve).not.toHaveBeenCalled();
    });

    it('should resolve relative specifiers within in-memory files', () => {
      const memoryUrl = new URL('./main.server.mjs', 'memory://').href;
      const rootResolve = resolve(memoryUrl, { parentURL: undefined }, () => {});
      const parentURL = rootResolve.url;

      const nextResolve = jasmine.createSpy('nextResolve');
      const result = resolve('./chunk-abc.mjs', { parentURL }, nextResolve);

      expect(nextResolve).not.toHaveBeenCalled();
      expect(result.format).toBe('module');
      expect(result.shortCircuit).toBeTrue();
      expect(result.url).toContain('/chunk-abc.mjs');
    });

    it('should resolve relative specifiers navigating parent directories within in-memory files', () => {
      const memoryUrl = new URL('./nested/chunk-sub.mjs', 'memory://').href;
      const rootResolve = resolve(memoryUrl, { parentURL: undefined }, () => {});
      const parentURL = rootResolve.url;

      const nextResolve = jasmine.createSpy('nextResolve');
      const result = resolve('../chunk-abc.mjs', { parentURL }, nextResolve);

      expect(nextResolve).not.toHaveBeenCalled();
      expect(result.format).toBe('module');
      expect(result.shortCircuit).toBeTrue();
      expect(result.url).toContain('/chunk-abc.mjs');
    });

    it('should fail when relative specifier from in-memory file does not exist', () => {
      const memoryUrl = new URL('./main.server.mjs', 'memory://').href;
      const rootResolve = resolve(memoryUrl, { parentURL: undefined }, () => {});
      const parentURL = rootResolve.url;

      const nextResolve = jasmine.createSpy('nextResolve');
      expect(() => {
        resolve('./non-existent.mjs', { parentURL }, nextResolve);
      }).toThrowMatching((err: Error) =>
        err.message.includes('In-memory ESM relative file should always exist'),
      );
      expect(nextResolve).not.toHaveBeenCalled();
    });

    it('should rewrite parentURL to index.js in virtual root for bare package specifiers', () => {
      const memoryUrl = new URL('./main.server.mjs', 'memory://').href;
      const rootResolve = resolve(memoryUrl, { parentURL: undefined }, () => {});
      const parentURL = rootResolve.url;

      const nextResolve = jasmine
        .createSpy('nextResolve')
        .and.returnValue({ url: 'file:///some/node_modules/@angular/core/index.js' });
      const result = resolve('@angular/core', { parentURL }, nextResolve);

      expect(nextResolve).toHaveBeenCalledWith(
        '@angular/core',
        jasmine.objectContaining({
          parentURL: jasmine.stringMatching(/\/\.angular\/prerender-root\/[^/]+\/index\.js$/),
        }),
      );
      expect(result.url).toBe('file:///some/node_modules/@angular/core/index.js');
    });

    it('should delegate to nextResolve for external non-memory URLs', () => {
      const nextResolve = jasmine
        .createSpy('nextResolve')
        .and.returnValue({ url: 'file:///some/ext/pkg' });
      const result = resolve('some-pkg', { parentURL: 'file:///some/ext/file.js' }, nextResolve);

      expect(nextResolve).toHaveBeenCalledWith('some-pkg', {
        parentURL: 'file:///some/ext/file.js',
      });
      expect(result.url).toBe('file:///some/ext/pkg');
    });
  });

  describe('load', () => {
    it('should load in-memory file source from SharedArrayBuffer backed Uint8Array', async () => {
      const memoryUrl = new URL('./main.server.mjs', 'memory://').href;
      const rootResolve = resolve(memoryUrl, { parentURL: undefined }, () => {});
      const nextLoad = jasmine.createSpy('nextLoad');

      const result = await load(rootResolve.url, { format: 'module' }, nextLoad);

      expect(nextLoad).not.toHaveBeenCalled();
      expect(result.format).toBe('module');
      expect(result.shortCircuit).toBeTrue();
      expect(result.source).toBe('export const main = true;');
    });

    it('should load in-memory file with multi-byte UTF-8 characters', async () => {
      const memoryUrl = new URL('./utf8.mjs', 'memory://').href;
      const rootResolve = resolve(memoryUrl, { parentURL: undefined }, () => {});
      const nextLoad = jasmine.createSpy('nextLoad');

      const result = await load(rootResolve.url, { format: 'module' }, nextLoad);

      expect(nextLoad).not.toHaveBeenCalled();
      expect(result.format).toBe('module');
      expect(result.shortCircuit).toBeTrue();
      expect(result.source).toBe('export const text = "🔥 UTF-8 🚀";');
    });

    it('should load in-memory file with empty content', async () => {
      const memoryUrl = new URL('./empty.mjs', 'memory://').href;
      const rootResolve = resolve(memoryUrl, { parentURL: undefined }, () => {});
      const nextLoad = jasmine.createSpy('nextLoad');

      const result = await load(rootResolve.url, { format: 'module' }, nextLoad);

      expect(nextLoad).not.toHaveBeenCalled();
      expect(result.format).toBe('module');
      expect(result.shortCircuit).toBeTrue();
      expect(result.source).toBe('');
    });

    it('should load in-memory file source with non-zero byteOffset in Uint8Array', async () => {
      const target = 'export const sliced = 42;';
      const fullBuffer = Buffer.from(`__PADDING__${target}__MORE__`);
      const offset = Buffer.byteLength('__PADDING__', 'utf-8');
      const length = Buffer.byteLength(target, 'utf-8');
      const subView = new Uint8Array(fullBuffer.buffer, fullBuffer.byteOffset + offset, length);

      initialize({
        workspaceRoot,
        outputFiles: {
          'sliced.mjs': subView,
        },
      });

      const memoryUrl = new URL('./sliced.mjs', 'memory://').href;
      const rootResolve = resolve(memoryUrl, { parentURL: undefined }, () => {});
      const nextLoad = jasmine.createSpy('nextLoad');

      const result = await load(rootResolve.url, { format: 'module' }, nextLoad);

      expect(nextLoad).not.toHaveBeenCalled();
      expect(result.format).toBe('module');
      expect(result.shortCircuit).toBeTrue();
      expect(result.source).toBe(target);
    });

    it('should load in-memory file source when outputFiles contain string values', async () => {
      initialize({
        workspaceRoot,
        outputFiles: {
          'string-file.mjs': 'export const fromString = 1;',
        },
      });

      const memoryUrl = new URL('./string-file.mjs', 'memory://').href;
      const rootResolve = resolve(memoryUrl, { parentURL: undefined }, () => {});
      const nextLoad = jasmine.createSpy('nextLoad');

      const result = await load(rootResolve.url, { format: 'module' }, nextLoad);

      expect(nextLoad).not.toHaveBeenCalled();
      expect(result.format).toBe('module');
      expect(result.shortCircuit).toBeTrue();
      expect(result.source).toBe('export const fromString = 1;');
    });

    it('should reject when in-memory file does not exist in outputFiles', async () => {
      const memoryUrl = new URL('./main.server.mjs', 'memory://').href;
      const rootResolve = resolve(memoryUrl, { parentURL: undefined }, () => {});
      const nonExistentVirtualUrl = rootResolve.url.replace('main.server.mjs', 'missing.mjs');
      const nextLoad = jasmine.createSpy('nextLoad');

      await expectAsync(
        load(nonExistentVirtualUrl, { format: 'module' }, nextLoad),
      ).toBeRejectedWithError(/Resolved in-memory ESM file should always exist/);
      expect(nextLoad).not.toHaveBeenCalled();
    });

    it('should delegate to nextLoad for non-angular file URLs', async () => {
      const nextLoad = jasmine.createSpy('nextLoad').and.resolveTo({ format: 'module' });
      const result = await load(
        'file:///workspace/node_modules/rxjs/index.js',
        { format: 'module' },
        nextLoad,
      );

      expect(nextLoad).toHaveBeenCalledWith('file:///workspace/node_modules/rxjs/index.js', {
        format: 'module',
      });
      expect(result.format).toBe('module');
    });

    it('should delegate to nextLoad for non-memory non-file URLs', async () => {
      const nextLoad = jasmine.createSpy('nextLoad').and.resolveTo({ format: 'builtin' });
      const result = await load('node:fs', { format: 'builtin' }, nextLoad);

      expect(nextLoad).toHaveBeenCalledWith('node:fs');
      expect(result.format).toBe('builtin');
    });
  });
});
