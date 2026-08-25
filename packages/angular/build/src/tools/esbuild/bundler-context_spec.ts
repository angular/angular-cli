/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BundlerContext } from './bundler-context';
import { MemoryLoadResultCache } from './load-result-cache';

describe('BundlerContext', () => {
  describe('invalidate', () => {
    it('should return false when incremental is disabled', () => {
      const context = new BundlerContext('/workspace', /* incremental */ false, () => ({
        entryPoints: ['main.js'],
      }));
      context.watchFiles.add('/workspace/src/app.css');

      expect(context.invalidate(['/workspace/src/app.css'])).toBeFalse();
    });

    it('should return true when a watch file matches changed files as an array', () => {
      const context = new BundlerContext('/workspace', /* incremental */ true, () => ({
        entryPoints: ['main.js'],
      }));
      context.watchFiles.add('/workspace/src/app.css');

      expect(context.invalidate(['/workspace/src/app.css'])).toBeTrue();
    });

    it('should return true when a watch file matches changed files as a ReadonlySet', () => {
      const context = new BundlerContext('/workspace', /* incremental */ true, () => ({
        entryPoints: ['main.js'],
      }));
      context.watchFiles.add('/workspace/src/app.css');

      const changedSet: ReadonlySet<string> = new Set(['/workspace/src/app.css']);
      expect(context.invalidate(changedSet)).toBeTrue();
    });

    it('should return false when changed files do not intersect with watchFiles', () => {
      const context = new BundlerContext('/workspace', /* incremental */ true, () => ({
        entryPoints: ['main.js'],
      }));
      context.watchFiles.add('/workspace/src/app.css');

      expect(context.invalidate(['/workspace/src/other.css'])).toBeFalse();
    });

    it('should correctly handle relative changed file paths', () => {
      const context = new BundlerContext('/workspace', /* incremental */ true, () => ({
        entryPoints: ['main.js'],
      }));
      context.watchFiles.add('/workspace/src/app.css');

      expect(context.invalidate(['src/app.css'])).toBeTrue();
    });

    it('should correctly handle relative paths inside a ReadonlySet', () => {
      const context = new BundlerContext('/workspace', /* incremental */ true, () => ({
        entryPoints: ['main.js'],
      }));
      context.watchFiles.add('/workspace/src/app.css');

      const set: ReadonlySet<string> = new Set(['src/app.css']);
      expect(context.invalidate(set)).toBeTrue();
    });

    it('should invalidate shared load cache when files change', async () => {
      const loadCache = new MemoryLoadResultCache();
      await loadCache.put('file:/workspace/src/app.css', {
        contents: 'body {}',
        loader: 'css',
        watchFiles: ['/workspace/src/app.css'],
      });

      const context = new BundlerContext(
        '/workspace',
        /* incremental */ true,
        () => ({ entryPoints: ['main.js'] }),
        /* useContext */ false,
        /* initialFilter */ undefined,
        loadCache,
      );

      expect(loadCache.get('file:/workspace/src/app.css')).toBeDefined();
      expect(context.invalidate(['/workspace/src/app.css'])).toBeTrue();
      expect(loadCache.get('file:/workspace/src/app.css')).toBeUndefined();
    });

    it('should work when watchFiles is smaller than changed files', () => {
      const context = new BundlerContext('/workspace', /* incremental */ true, () => ({
        entryPoints: ['main.js'],
      }));
      context.watchFiles.add('/workspace/src/file10.css');

      const changedFiles = Array.from({ length: 100 }, (_, i) => `/workspace/src/file${i}.css`);
      expect(context.invalidate(new Set(changedFiles))).toBeTrue();
    });

    it('should work when changed files is smaller than watchFiles', () => {
      const context = new BundlerContext('/workspace', /* incremental */ true, () => ({
        entryPoints: ['main.js'],
      }));
      for (let i = 0; i < 100; i++) {
        context.watchFiles.add(`/workspace/src/file${i}.css`);
      }

      expect(context.invalidate(new Set(['/workspace/src/file50.css']))).toBeTrue();
    });
  });
});
