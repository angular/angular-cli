/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createComponentStylesheetBundlerForLibrary } from '../../../builders/library/pipeline/stylesheet-bundler';
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
    const loadCache = new MemoryLoadResultCache();

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
      loadCache,
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

  it('evicts angular:styles/component loadCache entries when the containing component .ts file is invalidated', async () => {
    const testDir = await mkdtemp(join(tempRoot, 'inline-evict-'));
    const componentFile = join(testDir, 'comp.ts');
    const loadCache = new MemoryLoadResultCache();
    const putSpy = spyOn(loadCache, 'put').and.callThrough();

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
      loadCache,
    );

    try {
      const result = await bundler.bundleInline('.btn { color: red; }', componentFile, 'scss');
      expect(result.errors).toBeUndefined();
      expect(putSpy).toHaveBeenCalledTimes(1);

      const cacheKey = putSpy.calls.mostRecent().args[0];
      expect(cacheKey).toMatch(/^angular:styles\/component:scss;/);
      expect(loadCache.get(cacheKey)).toBeDefined();

      bundler.invalidate([componentFile]);

      expect(loadCache.get(cacheKey)).toBeUndefined();
    } finally {
      await bundler.dispose();
    }
  });

  it('persists and reuses stylesheet load results across builds when persistent cache is enabled', async () => {
    const testDir = await mkdtemp(join(tempRoot, 'persistent-cache-'));
    const cacheDir = join(testDir, '.angular', 'cache');
    await mkdir(testDir, { recursive: true });
    const styleFile = join(testDir, 'comp.scss');
    await writeFile(styleFile, '$primary: blue;\n.card { color: $primary; }\n');

    const options = {
      workspaceRoot: testDir,
      preserveSymlinks: false,
      styleIncludePaths: [],
      sass: undefined,
      cacheOptions: {
        enabled: true,
        path: cacheDir,
        basePath: cacheDir,
      },
      inlineStyleLanguage: 'scss' as const,
      postcssConfiguration: undefined,
      tailwindConfiguration: undefined,
    };

    const firstBundler = createComponentStylesheetBundlerForLibrary(options, false, ['es2022']);
    try {
      const firstResult = await firstBundler.bundleFile(styleFile);
      expect(firstResult.errors).toBeUndefined();
      expect(firstResult.contents).toContain('.card{color:#00f}');
    } finally {
      await firstBundler.dispose();
    }

    const secondBundler = createComponentStylesheetBundlerForLibrary(options, false, ['es2022']);
    try {
      const secondResult = await secondBundler.bundleFile(styleFile);
      expect(secondResult.errors).toBeUndefined();
      expect(secondResult.contents).toContain('.card{color:#00f}');
    } finally {
      await secondBundler.dispose();
    }
  });
});
