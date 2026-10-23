/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BundlerContext } from './bundler-context';
import { MemoryLoadResultCache, createCachedLoad } from './load-result-cache';

describe('BundlerContext', () => {
  let tempRoot: string;

  beforeAll(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-bundler-context-test-'));
  });

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
      context.watchFiles.add('/workspace/src/app.css');

      expect(loadCache.get('file:/workspace/src/app.css')).toBeDefined();
      expect(context.invalidate(['/workspace/src/app.css'])).toBeTrue();
      expect(loadCache.get('file:/workspace/src/app.css')).toBeUndefined();
    });

    it('should not invalidate unrelated contexts sharing a load cache', async () => {
      const workspaceDir = await mkdtemp(join(tempRoot, 'shared-cache-'));
      const compAPath = join(workspaceDir, 'comp-a.css');
      const compBPath = join(workspaceDir, 'comp-b.css');
      await writeFile(compAPath, '.a { color: red; }');
      await writeFile(compBPath, '.b { color: blue; }');

      const sharedCache = new MemoryLoadResultCache();
      const createCssContext = (entry: string) =>
        new BundlerContext(
          workspaceDir,
          /* incremental */ true,
          (loadCache) => ({
            absWorkingDir: workspaceDir,
            bundle: true,
            entryPoints: [entry],
            outdir: workspaceDir,
            plugins: [
              {
                name: 'test-cached-css',
                setup(build) {
                  build.onLoad(
                    { filter: /\.css$/ },
                    createCachedLoad(loadCache, async (args) => ({
                      contents: await import('node:fs/promises').then((f) =>
                        f.readFile(args.path, 'utf8'),
                      ),
                      loader: 'css',
                      watchFiles: [args.path],
                    })),
                  );
                },
              },
            ],
          }),
          /* useContext */ false,
          /* initialFilter */ undefined,
          sharedCache,
        );

      const contextA = createCssContext(compAPath);
      const contextB = createCssContext(compBPath);

      const resultA1 = await contextA.bundle();
      const resultB1 = await contextB.bundle();
      expect(resultA1.errors).toBeUndefined();
      expect(resultB1.errors).toBeUndefined();

      await writeFile(compAPath, '.a { color: green; }');

      // Even if contextB.invalidate runs first against the shared cache, contextB must not be invalidated
      expect(contextB.invalidate([compAPath])).toBeFalse();
      expect(contextA.invalidate([compAPath])).toBeTrue();

      const resultB2 = await contextB.bundle();
      const resultA2 = await contextA.bundle();
      expect(resultB2).toBe(resultB1);
      expect(resultA2).not.toBe(resultA1);
      if (!resultA2.errors) {
        expect(resultA2.outputFiles[0].text).toContain('green');
      }
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

  describe('bundle', () => {
    it('should recover when fixing a broken @import in plain CSS in watch mode', async () => {
      const workspaceDir = await mkdtemp(join(tempRoot, 'css-import-recovery-'));
      const compCssPath = join(workspaceDir, 'comp.css');
      const subCssPath = join(workspaceDir, 'sub.css');
      await writeFile(compCssPath, "@import './sub.css';");
      await writeFile(subCssPath, "@import './non-existent.css';");

      const context = new BundlerContext(
        workspaceDir,
        /* incremental */ true,
        () => ({
          absWorkingDir: workspaceDir,
          bundle: true,
          entryPoints: [compCssPath],
          outdir: workspaceDir,
          logLevel: 'silent',
        }),
        /* useContext */ false,
      );

      const failedResult = await context.bundle();
      expect(failedResult.errors).toBeDefined();
      expect(context.watchFiles.has(subCssPath)).toBeTrue();
      expect(context.watchFiles.has(compCssPath)).toBeTrue();

      // Fix sub.css and verify invalidation + recovery
      await writeFile(subCssPath, '.sub { color: purple; }');
      expect(context.invalidate([subCssPath])).toBeTrue();

      const recoveredResult = await context.bundle();
      expect(recoveredResult.errors).toBeUndefined();
      if (!recoveredResult.errors) {
        expect(recoveredResult.outputFiles[0].text).toContain('purple');
      }
    });
  });
});
