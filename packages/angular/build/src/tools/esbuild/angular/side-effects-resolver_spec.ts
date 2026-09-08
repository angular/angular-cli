/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { PluginBuild } from 'esbuild';
import assert from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import {
  SideEffectsResolver,
  createSideEffectsResolver,
  getPackageDirectory,
} from './side-effects-resolver';

describe('getPackageDirectory', () => {
  it('should extract package dir for a standard package in node_modules', () => {
    const filePath = '/workspace/node_modules/rxjs/dist/esm5/index.js';
    expect(getPackageDirectory(filePath)).toBe('/workspace/node_modules/rxjs');
  });

  it('should extract package dir for a scoped package in node_modules', () => {
    const filePath = '/workspace/node_modules/@angular/core/fesm2022/core.mjs';
    expect(getPackageDirectory(filePath)).toBe('/workspace/node_modules/@angular/core');
  });

  it('should extract package dir for nested node_modules', () => {
    const filePath = '/workspace/node_modules/foo/node_modules/@bar/baz/dist/index.js';
    expect(getPackageDirectory(filePath)).toBe('/workspace/node_modules/foo/node_modules/@bar/baz');
  });

  it('should extract package dir for relative node_modules paths', () => {
    const filePath = 'node_modules/@angular/core/fesm2022/core.mjs';
    expect(getPackageDirectory(filePath)).toBe('node_modules/@angular/core');
  });

  it('should extract package dir for Windows formatted paths', () => {
    const filePath = 'C:\\workspace\\node_modules\\@angular\\core\\fesm2022\\core.mjs';
    expect(getPackageDirectory(filePath)).toBe('C:\\workspace\\node_modules\\@angular\\core');
  });

  it('should return undefined for files not in node_modules', () => {
    const filePath = '/workspace/src/app/app.component.ts';
    expect(getPackageDirectory(filePath)).toBeUndefined();
  });
});

describe('SideEffectsResolver', () => {
  let testDir: string;
  let mockBuild: {
    resolve: jasmine.Spy;
    initialOptions: { absWorkingDir: string };
  };

  beforeEach(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    testDir = await mkdtemp(path.join(baseTmpDir, 'side-effects-test-'));
    mockBuild = {
      resolve: jasmine.createSpy('resolve').and.callFake(async (targetPath: string) => ({
        errors: [],
        warnings: [],
        path: targetPath,
        external: false,
        sideEffects: true,
        namespace: 'file',
        suffix: '',
        pluginData: null,
      })),
      initialOptions: { absWorkingDir: testDir },
    };
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  async function createPackage(
    pkgName: string,
    pkgJsonContent: Record<string, unknown>,
    subFiles: string[] = ['index.js'],
  ): Promise<string[]> {
    const pkgDir = path.join(testDir, 'node_modules', pkgName);
    await mkdir(pkgDir, { recursive: true });
    await writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify(pkgJsonContent, null, 2),
      'utf-8',
    );

    const filePaths: string[] = [];
    for (const subFile of subFiles) {
      const fullPath = path.join(pkgDir, subFile);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, '// test file', 'utf-8');
      filePaths.push(fullPath);
    }

    return filePaths;
  }

  describe('when advancedOptimizations is false', () => {
    it('should return undefined and avoid resolution or package reads', async () => {
      const [file] = await createPackage('pure-pkg', { sideEffects: false });
      const resolver = createSideEffectsResolver(mockBuild as unknown as PluginBuild, false);

      const result = await resolver(file);
      expect(result).toBeUndefined();
      expect(mockBuild.resolve).not.toHaveBeenCalled();
    });

    it('should return undefined via SideEffectsResolver instance directly', async () => {
      const [file] = await createPackage('pure-pkg', { sideEffects: false });
      const resolver = new SideEffectsResolver(mockBuild as unknown as PluginBuild, false);

      const result = await resolver.resolve(file);
      expect(result).toBeUndefined();
      expect(mockBuild.resolve).not.toHaveBeenCalled();
    });
  });

  describe('when package has sideEffects: false', () => {
    it('should return false and memoize package-level result across multiple files', async () => {
      const [file1, file2] = await createPackage('pure-pkg', { sideEffects: false }, [
        'file1.js',
        'file2.js',
      ]);
      const resolver = createSideEffectsResolver(mockBuild as unknown as PluginBuild, true);

      const result1 = await resolver(file1);
      const result2 = await resolver(file2);

      expect(result1).toBeFalse();
      expect(result2).toBeFalse();
      expect(mockBuild.resolve).not.toHaveBeenCalled();

      // Repeated lookup for the same file returns memoized result
      const result1Cached = await resolver(file1);
      expect(result1Cached).toBeFalse();
      expect(mockBuild.resolve).not.toHaveBeenCalled();
    });
  });

  describe('when package has sideEffects: true', () => {
    it('should return true and memoize package-level result across multiple files', async () => {
      const [file1, file2] = await createPackage('impure-pkg', { sideEffects: true }, [
        'file1.js',
        'file2.js',
      ]);
      const resolver = createSideEffectsResolver(mockBuild as unknown as PluginBuild, true);

      const result1 = await resolver(file1);
      const result2 = await resolver(file2);

      expect(result1).toBeTrue();
      expect(result2).toBeTrue();
      expect(mockBuild.resolve).not.toHaveBeenCalled();
    });
  });

  describe('when package has non-boolean sideEffects (array of globs or omitted)', () => {
    it('should fallback to build.resolve per file when sideEffects is an array', async () => {
      const [file1, file2] = await createPackage('glob-pkg', { sideEffects: ['*.css'] }, [
        'index.js',
        'styles.css',
      ]);

      mockBuild.resolve.and.callFake(async (targetPath: string) => ({
        errors: [],
        warnings: [],
        path: targetPath,
        external: false,
        sideEffects: targetPath.endsWith('.css'),
        namespace: 'file',
        suffix: '',
        pluginData: null,
      }));

      const resolver = createSideEffectsResolver(mockBuild as unknown as PluginBuild, true);

      const result1 = await resolver(file1);
      const result2 = await resolver(file2);

      expect(result1).toBeFalse();
      expect(result2).toBeTrue();
      expect(mockBuild.resolve).toHaveBeenCalledTimes(2);

      // Memoization of file-level result prevents second build.resolve call for the same file
      const result1Cached = await resolver(file1);
      expect(result1Cached).toBeFalse();
      expect(mockBuild.resolve).toHaveBeenCalledTimes(2);
    });

    it('should fallback to build.resolve per file when sideEffects is omitted', async () => {
      const [file] = await createPackage('no-side-effects-pkg', { name: 'no-side-effects-pkg' });

      mockBuild.resolve.and.callFake(async (targetPath: string) => ({
        errors: [],
        warnings: [],
        path: targetPath,
        external: false,
        sideEffects: false,
        namespace: 'file',
        suffix: '',
        pluginData: null,
      }));

      const resolver = createSideEffectsResolver(mockBuild as unknown as PluginBuild, true);

      const result = await resolver(file);
      expect(result).toBeFalse();
      expect(mockBuild.resolve).toHaveBeenCalledTimes(1);

      // Subsequent call uses file-level cache
      const cachedResult = await resolver(file);
      expect(cachedResult).toBeFalse();
      expect(mockBuild.resolve).toHaveBeenCalledTimes(1);
    });
  });

  describe('when package is scoped (@scope/pkg)', () => {
    it('should correctly memoize package-level sideEffects for scoped packages', async () => {
      const [file1, file2] = await createPackage('@angular/core', { sideEffects: false }, [
        'index.js',
        'signals.js',
      ]);

      const resolver = createSideEffectsResolver(mockBuild as unknown as PluginBuild, true);

      expect(await resolver(file1)).toBeFalse();
      expect(await resolver(file2)).toBeFalse();
      expect(mockBuild.resolve).not.toHaveBeenCalled();
    });
  });

  describe('when file is not in node_modules', () => {
    it('should resolve via build.resolve and memoize file-level result', async () => {
      const appFile = path.join(testDir, 'src', 'main.js');
      await mkdir(path.dirname(appFile), { recursive: true });
      await writeFile(appFile, '// app', 'utf-8');

      mockBuild.resolve.and.callFake(async (targetPath: string) => ({
        errors: [],
        warnings: [],
        path: targetPath,
        external: false,
        sideEffects: true,
        namespace: 'file',
        suffix: '',
        pluginData: null,
      }));

      const resolver = createSideEffectsResolver(mockBuild as unknown as PluginBuild, true);

      const result1 = await resolver(appFile);
      expect(result1).toBeTrue();
      expect(mockBuild.resolve).toHaveBeenCalledTimes(1);

      const result2 = await resolver(appFile);
      expect(result2).toBeTrue();
      expect(mockBuild.resolve).toHaveBeenCalledTimes(1);
    });
  });

  describe('when package.json is missing or corrupted', () => {
    it('should fallback to build.resolve if package.json does not exist', async () => {
      const pkgDir = path.join(testDir, 'node_modules', 'missing-pkg');
      await mkdir(pkgDir, { recursive: true });
      const file = path.join(pkgDir, 'index.js');
      await writeFile(file, '// test', 'utf-8');

      mockBuild.resolve.and.callFake(async (targetPath: string) => ({
        errors: [],
        warnings: [],
        path: targetPath,
        external: false,
        sideEffects: false,
        namespace: 'file',
        suffix: '',
        pluginData: null,
      }));

      const resolver = createSideEffectsResolver(mockBuild as unknown as PluginBuild, true);

      expect(await resolver(file)).toBeFalse();
      expect(mockBuild.resolve).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrency', () => {
    it('should handle concurrent file resolutions for the same package cleanly', async () => {
      const files = await createPackage('concurrent-pkg', { sideEffects: false }, [
        'a.js',
        'b.js',
        'c.js',
        'd.js',
      ]);

      const resolver = createSideEffectsResolver(mockBuild as unknown as PluginBuild, true);

      const results = await Promise.all(files.map((file) => resolver(file)));
      expect(results).toEqual([false, false, false, false]);
      expect(mockBuild.resolve).not.toHaveBeenCalled();
    });

    it('should coalesce concurrent build.resolve calls for the exact same file', async () => {
      const appFile = path.join(testDir, 'src', 'shared.js');
      await mkdir(path.dirname(appFile), { recursive: true });
      await writeFile(appFile, '// shared', 'utf-8');

      const resolver = createSideEffectsResolver(mockBuild as unknown as PluginBuild, true);

      const [r1, r2] = await Promise.all([resolver(appFile), resolver(appFile)]);
      expect(r1).toBeTrue();
      expect(r2).toBeTrue();
      expect(mockBuild.resolve).toHaveBeenCalledTimes(1);
    });
  });
});
