/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { initializeHash } from '../../../utils/hash';
import { MemoryLoadResultCache } from '../load-result-cache';
import { resetSassWorkerPoolCaches, shutdownSassWorkerPool } from '../stylesheets/sass-language';
import { ComponentStylesheetBundler } from './component-stylesheets';

describe('ComponentStylesheetBundler', () => {
  let tempRoot: string;

  beforeAll(async () => {
    await initializeHash();
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-component-stylesheets-'));
  });

  afterAll(async () => {
    shutdownSassWorkerPool();
    await rm(tempRoot, { force: true, recursive: true });
  });

  it('invalidates cached inline stylesheet errors when the containing component .ts file is invalidated', async () => {
    const testDir = await mkdtemp(join(tempRoot, 'inline-error-recovery-'));
    const componentFile = join(testDir, 'comp.ts');
    const partialFile = join(testDir, '_missing.scss');

    const bundler = new ComponentStylesheetBundler(
      {
        workspaceRoot: testDir,
        optimization: false,
        inlineFonts: false,
        sourcemap: false,
        outputNames: { bundles: '[name]', media: 'media/[name]' },
        target: ['es2022'],
        cacheOptions: { enabled: false, path: '', basePath: testDir },
      },
      'scss',
      true,
    );

    try {
      const initialResult = await bundler.bundleInline('@use "./missing";', componentFile, 'scss');
      assert(
        initialResult.errors,
        'Expected initial bundleInline to fail when _missing.scss does not exist',
      );
      expect(initialResult.errors.length).toBeGreaterThan(0);

      await writeFile(partialFile, '.recovered { color: green; }');
      resetSassWorkerPoolCaches();

      bundler.invalidate([componentFile]);

      const recoveredResult = await bundler.bundleInline(
        '@use "./missing";',
        componentFile,
        'scss',
      );
      expect(recoveredResult.errors).toBeUndefined();
      expect(recoveredResult.contents).toContain('.recovered');
      expect(recoveredResult.contents).toContain('green');
    } finally {
      await bundler.dispose();
    }
  });

  it('should evict #loadCache entries when invalidating inline component stylesheets', async () => {
    const testDir = await mkdtemp(join(tempRoot, 'inline-evict-'));
    const componentFile = join(testDir, 'comp.ts');
    const putSpy = spyOn(MemoryLoadResultCache.prototype, 'put').and.callThrough();
    const invalidateSpy = spyOn(MemoryLoadResultCache.prototype, 'invalidate').and.callThrough();

    const bundler = new ComponentStylesheetBundler(
      {
        workspaceRoot: testDir,
        optimization: false,
        inlineFonts: false,
        sourcemap: false,
        outputNames: { bundles: '[name]', media: 'media/[name]' },
        target: ['es2022'],
        cacheOptions: { enabled: false, path: '', basePath: testDir },
      },
      'scss',
      true,
    );

    try {
      const result = await bundler.bundleInline('.btn { color: red; }', componentFile, 'scss');
      expect(result.errors).toBeUndefined();
      expect(putSpy).toHaveBeenCalledTimes(1);

      const cacheKey = putSpy.calls.mostRecent().args[0];
      expect(cacheKey).toMatch(/^angular:styles\/component:scss;/);

      bundler.invalidate([componentFile]);

      expect(invalidateSpy).toHaveBeenCalledWith(cacheKey);
      expect(invalidateSpy).toHaveBeenCalledWith(componentFile);

      const secondResult = await bundler.bundleInline(
        '.btn { color: red; }',
        componentFile,
        'scss',
      );
      expect(secondResult.errors).toBeUndefined();
      expect(putSpy).toHaveBeenCalledTimes(2);
    } finally {
      await bundler.dispose();
    }
  });
});
