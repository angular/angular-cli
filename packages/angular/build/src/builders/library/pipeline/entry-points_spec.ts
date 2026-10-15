/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join } from 'node:path';
import { BuilderState } from '../builder-state';
import type {
  BundleResult,
  NormalizedEntryPoint,
  NormalizedLibraryOptions,
  PackageJsonData,
} from '../types';
import {
  collectEntryPointsToBundle,
  getEntryPointBundleName,
  haveEntryPointsChanged,
  normalizeEntryPoints,
  updateWatchedEntryPoints,
} from './entry-points';

describe('entry-points pipeline', () => {
  const projectRoot = '/workspace/projects/my-lib';
  const packageJsonPath = join(projectRoot, 'package.json');
  const packageName = '@my-scope/my-lib';

  function createBundleResult(overrides: Partial<BundleResult> = {}): BundleResult {
    return {
      esmModuleIds: new Set(),
      dtsModuleIds: new Set(),
      esmOutputFiles: new Set(),
      dtsOutputFiles: new Set(),
      hasTslibImport: false,
      ...overrides,
    };
  }

  describe('getEntryPointBundleName', () => {
    it('should compute bundle name for primary entry point without scope', () => {
      expect(getEntryPointBundleName('my-lib')).toBe('my-lib');
      expect(getEntryPointBundleName('my-lib', '.')).toBe('my-lib');
    });

    it('should compute bundle name for primary entry point with scope', () => {
      expect(getEntryPointBundleName('@my-scope/my-lib')).toBe('my-scope-my-lib');
      expect(getEntryPointBundleName('@my-scope/my-lib', '.')).toBe('my-scope-my-lib');
    });

    it('should compute bundle name for secondary entry point without scope', () => {
      expect(getEntryPointBundleName('my-lib', 'testing')).toBe('my-lib-testing');
    });

    it('should compute bundle name for secondary entry point with scope', () => {
      expect(getEntryPointBundleName('@my-scope/my-lib', 'testing')).toBe(
        'my-scope-my-lib-testing',
      );
    });

    it('should replace nested slashes with dashes in secondary entry point name', () => {
      expect(getEntryPointBundleName('@my-scope/my-lib', 'testing/sub/deep')).toBe(
        'my-scope-my-lib-testing-sub-deep',
      );
    });

    it('should lowercase bundle name', () => {
      expect(getEntryPointBundleName('@My-Scope/My-Lib', 'Testing/Sub')).toBe(
        'my-scope-my-lib-testing-sub',
      );
    });
  });

  describe('normalizeEntryPoints', () => {
    it('should parse string shorthand exports', () => {
      const entryPoints = normalizeEntryPoints(
        './src/public-api.ts',
        projectRoot,
        packageJsonPath,
        packageName,
      );

      expect(entryPoints).toHaveSize(1);
      const primary = entryPoints.get('.');
      expect(primary).toEqual({
        subpath: '.',
        name: '.',
        displayName: packageName,
        bundleName: 'my-scope-my-lib',
        entryFilePath: join(projectRoot, 'src/public-api.ts'),
        isPrimary: true,
      });
    });

    it('should parse array shorthand exports', () => {
      const entryPoints = normalizeEntryPoints(
        ['./src/public-api.ts'],
        projectRoot,
        packageJsonPath,
        packageName,
      );

      expect(entryPoints).toHaveSize(1);
      const primary = entryPoints.get('.');
      expect(primary).toEqual({
        subpath: '.',
        name: '.',
        displayName: packageName,
        bundleName: 'my-scope-my-lib',
        entryFilePath: join(projectRoot, 'src/public-api.ts'),
        isPrimary: true,
      });
    });

    it('should parse array shorthand exports with conditional objects', () => {
      const entryPoints = normalizeEntryPoints(
        [{ default: './src/public-api.ts' }],
        projectRoot,
        packageJsonPath,
        packageName,
      );

      expect(entryPoints).toHaveSize(1);
      const primary = entryPoints.get('.');
      expect(primary).toEqual({
        subpath: '.',
        name: '.',
        displayName: packageName,
        bundleName: 'my-scope-my-lib',
        entryFilePath: join(projectRoot, 'src/public-api.ts'),
        isPrimary: true,
      });
    });

    it('should parse root conditional exports without leading "."', () => {
      const entryPoints = normalizeEntryPoints(
        { default: './src/public-api.ts' },
        projectRoot,
        packageJsonPath,
        packageName,
      );

      expect(entryPoints).toHaveSize(1);
      const primary = entryPoints.get('.');
      expect(primary).toEqual({
        subpath: '.',
        name: '.',
        displayName: packageName,
        bundleName: 'my-scope-my-lib',
        entryFilePath: join(projectRoot, 'src/public-api.ts'),
        isPrimary: true,
      });
    });

    it('should parse object exports with array targets', () => {
      const rawExports = {
        '.': ['./src/public-api.ts'],
        './testing': [{ default: './testing/src/public-api.ts' }],
      };

      const entryPoints = normalizeEntryPoints(
        rawExports,
        projectRoot,
        packageJsonPath,
        packageName,
      );

      expect(entryPoints).toHaveSize(2);
      expect(entryPoints.get('.')?.entryFilePath).toBe(join(projectRoot, 'src/public-api.ts'));
      expect(entryPoints.get('testing')?.entryFilePath).toBe(
        join(projectRoot, 'testing/src/public-api.ts'),
      );
    });

    it('should parse object exports with primary and secondary entry points', () => {
      const rawExports = {
        '.': './src/public-api.ts',
        './testing': './testing/src/public-api.ts',
        './testing/sub': './testing/sub/src/public-api.mts',
      };

      const entryPoints = normalizeEntryPoints(
        rawExports,
        projectRoot,
        packageJsonPath,
        packageName,
      );

      expect(entryPoints).toHaveSize(3);

      const primary = entryPoints.get('.');
      expect(primary).toEqual({
        subpath: '.',
        name: '.',
        displayName: packageName,
        bundleName: 'my-scope-my-lib',
        entryFilePath: join(projectRoot, 'src/public-api.ts'),
        isPrimary: true,
      });

      const secondary = entryPoints.get('testing');
      expect(secondary).toEqual({
        subpath: './testing',
        name: 'testing',
        displayName: `${packageName}/testing`,
        bundleName: 'my-scope-my-lib-testing',
        entryFilePath: join(projectRoot, 'testing/src/public-api.ts'),
        isPrimary: false,
      });

      const nested = entryPoints.get('testing/sub');
      expect(nested).toEqual({
        subpath: './testing/sub',
        name: 'testing/sub',
        displayName: `${packageName}/testing/sub`,
        bundleName: 'my-scope-my-lib-testing-sub',
        entryFilePath: join(projectRoot, 'testing/sub/src/public-api.mts'),
        isPrimary: false,
      });
    });

    it('should handle conditional exports with "default"', () => {
      const rawExports = {
        '.': { default: './src/public-api.ts' },
        './testing': { default: './testing/src/public-api.ts' },
      };

      const entryPoints = normalizeEntryPoints(
        rawExports,
        projectRoot,
        packageJsonPath,
        packageName,
      );

      expect(entryPoints).toHaveSize(2);
      expect(entryPoints.get('.')?.entryFilePath).toBe(join(projectRoot, 'src/public-api.ts'));
      expect(entryPoints.get('testing')?.entryFilePath).toBe(
        join(projectRoot, 'testing/src/public-api.ts'),
      );
    });

    it('should ignore non-TypeScript exports for secondary subpaths', () => {
      const rawExports = {
        '.': './src/public-api.ts',
        './package.json': './package.json',
        './styles.css': './styles.css',
        './theme': { sass: './theme.scss' },
      };

      const entryPoints = normalizeEntryPoints(
        rawExports,
        projectRoot,
        packageJsonPath,
        packageName,
      );

      expect(entryPoints).toHaveSize(1);
      expect(entryPoints.has('.')).toBeTrue();
      expect(entryPoints.has('package.json')).toBeFalse();
      expect(entryPoints.has('styles.css')).toBeFalse();
      expect(entryPoints.has('theme')).toBeFalse();
    });

    it('should throw when exports is missing or not an object/string', () => {
      expect(() =>
        normalizeEntryPoints(undefined, projectRoot, packageJsonPath, packageName),
      ).toThrowError(/must contain an 'exports' field defining the primary entry point/);

      expect(() =>
        normalizeEntryPoints(null, projectRoot, packageJsonPath, packageName),
      ).toThrowError(/must contain an 'exports' field defining the primary entry point/);

      expect(() =>
        normalizeEntryPoints(123, projectRoot, packageJsonPath, packageName),
      ).toThrowError(/must contain an 'exports' field defining the primary entry point/);
    });

    it('should throw when primary entry point "." is missing', () => {
      const rawExports = {
        './testing': './testing/src/public-api.ts',
      };

      expect(() =>
        normalizeEntryPoints(rawExports, projectRoot, packageJsonPath, packageName),
      ).toThrowError(/must contain a primary entry point with key '\.'/);
    });

    it('should throw when primary entry point does not have a target path or default', () => {
      const rawExports = {
        '.': { require: './src/public-api.js' },
      };

      expect(() =>
        normalizeEntryPoints(rawExports, projectRoot, packageJsonPath, packageName),
      ).toThrowError(/must specify a string path or a 'default' condition/);

      expect(() =>
        normalizeEntryPoints([], projectRoot, packageJsonPath, packageName),
      ).toThrowError(/must specify a string path or a 'default' condition/);
    });

    it('should throw when entry point target is not a TypeScript file', () => {
      expect(() =>
        normalizeEntryPoints(
          { '.': './src/public-api.js' },
          projectRoot,
          packageJsonPath,
          packageName,
        ),
      ).toThrowError(/must be a TypeScript file \('\.ts' or '\.mts'\)/);

      expect(() =>
        normalizeEntryPoints(
          { '.': './src/public-api.cts' },
          projectRoot,
          packageJsonPath,
          packageName,
        ),
      ).toThrowError(/must be a TypeScript file \('\.ts' or '\.mts'\)/);

      expect(() =>
        normalizeEntryPoints(
          { '.': './src/public-api.d.ts' },
          projectRoot,
          packageJsonPath,
          packageName,
        ),
      ).toThrowError(/must be a TypeScript file \('\.ts' or '\.mts'\)/);
    });

    it('should throw when entry point key contains ".." or is absolute', () => {
      expect(() =>
        normalizeEntryPoints(
          { '.': './src/public-api.ts', './../evil': './evil/src/public-api.ts' },
          projectRoot,
          packageJsonPath,
          packageName,
        ),
      ).toThrowError(/Entry point keys must be relative subpaths without '\.\.'/);

      expect(() =>
        normalizeEntryPoints(
          { '.': './src/public-api.ts', '/abs': './evil/src/public-api.ts' },
          projectRoot,
          packageJsonPath,
          packageName,
        ),
      ).toThrowError(/Entry point keys must be relative subpaths without '\.\.'/);
    });

    it('should throw when duplicate entry point names resolve', () => {
      expect(() =>
        normalizeEntryPoints(
          {
            '.': './src/public-api.ts',
            './testing': './testing/src/public-api.ts',
            'testing': './testing2/src/public-api.ts',
          },
          projectRoot,
          packageJsonPath,
          packageName,
        ),
      ).toThrowError(/Duplicate entry point detected/);
    });

    it('should throw when entry point names differ only by slashes vs hyphens', () => {
      expect(() =>
        normalizeEntryPoints(
          {
            '.': './src/public-api.ts',
            './zz/child': './zz/child/src/public-api.ts',
            './zz-child': './zz-child/src/public-api.ts',
          },
          projectRoot,
          packageJsonPath,
          packageName,
        ),
      ).toThrowError(
        /Duplicate entry point detected: '\.\/zz-child' resolves to the same bundle name \('my-scope-my-lib-zz-child'\)/,
      );
    });

    it('should throw when entry point names differ only by case', () => {
      expect(() =>
        normalizeEntryPoints(
          {
            '.': './src/public-api.ts',
            './testing': './testing/src/public-api.ts',
            './Testing': './testing2/src/public-api.ts',
          },
          projectRoot,
          packageJsonPath,
          packageName,
        ),
      ).toThrowError(
        /Duplicate entry point detected: '\.\/Testing' resolves to the same bundle name \('my-scope-my-lib-testing'\)/,
      );
    });

    it('should throw when entry point names differ by case and slashes vs hyphens', () => {
      expect(() =>
        normalizeEntryPoints(
          {
            '.': './src/public-api.ts',
            './ZZ/Child': './zz/child/src/public-api.ts',
            './zz-child': './zz-child/src/public-api.ts',
          },
          projectRoot,
          packageJsonPath,
          packageName,
        ),
      ).toThrowError(
        /Duplicate entry point detected: '\.\/zz-child' resolves to the same bundle name \('my-scope-my-lib-zz-child'\)/,
      );
    });
  });

  describe('haveEntryPointsChanged', () => {
    function createMap(items: NormalizedEntryPoint[]): Map<string, NormalizedEntryPoint> {
      return new Map(items.map((item) => [item.name, item]));
    }

    const primaryEp: NormalizedEntryPoint = {
      subpath: '.',
      name: '.',
      displayName: 'my-lib',
      bundleName: 'my-lib',
      entryFilePath: join(projectRoot, 'src/public-api.ts'),
      isPrimary: true,
    };

    const secondaryEp: NormalizedEntryPoint = {
      subpath: './testing',
      name: 'testing',
      displayName: 'my-lib/testing',
      bundleName: 'my-lib-testing',
      entryFilePath: join(projectRoot, 'testing/src/public-api.ts'),
      isPrimary: false,
    };

    it('should return false when entry points are identical', () => {
      const mapA = createMap([primaryEp, secondaryEp]);
      const mapB = createMap([{ ...primaryEp }, { ...secondaryEp }]);

      expect(haveEntryPointsChanged(mapA, mapB)).toBeFalse();
    });

    it('should return true when sizes differ', () => {
      const mapA = createMap([primaryEp]);
      const mapB = createMap([primaryEp, secondaryEp]);

      expect(haveEntryPointsChanged(mapA, mapB)).toBeTrue();
      expect(haveEntryPointsChanged(mapB, mapA)).toBeTrue();
    });

    it('should return true when an entry point file path changes', () => {
      const mapA = createMap([primaryEp]);
      const mapB = createMap([
        {
          ...primaryEp,
          entryFilePath: join(projectRoot, 'src/other.ts'),
        },
      ]);

      expect(haveEntryPointsChanged(mapA, mapB)).toBeTrue();
    });

    it('should return true when an entry point subpath changes', () => {
      const mapA = createMap([secondaryEp]);
      const mapB = createMap([
        {
          ...secondaryEp,
          subpath: './other-subpath',
        },
      ]);

      expect(haveEntryPointsChanged(mapA, mapB)).toBeTrue();
    });

    it('should return true when keys differ with the same size', () => {
      const mapA = createMap([secondaryEp]);
      const mapB = createMap([
        {
          ...secondaryEp,
          name: 'other',
        },
      ]);

      expect(haveEntryPointsChanged(mapA, mapB)).toBeTrue();
    });

    it('should return true when an entry point bundleName changes', () => {
      const mapA = createMap([primaryEp]);
      const mapB = createMap([
        {
          ...primaryEp,
          bundleName: 'my-scope-my-lib-renamed',
        },
      ]);

      expect(haveEntryPointsChanged(mapA, mapB)).toBeTrue();
    });

    it('should return true when an entry point displayName changes', () => {
      const mapA = createMap([primaryEp]);
      const mapB = createMap([
        {
          ...primaryEp,
          displayName: '@my-scope/renamed-lib',
        },
      ]);

      expect(haveEntryPointsChanged(mapA, mapB)).toBeTrue();
    });
  });

  describe('updateWatchedEntryPoints', () => {
    const tsConfigPath = join(projectRoot, 'tsconfig.lib.json');

    it('should update options, watched files, build state, and prune removed bundles when entry points change', () => {
      const initialEntryPoints = normalizeEntryPoints(
        {
          '.': './src/public-api.ts',
          './old-feature': './old-feature/src/public-api.ts',
        },
        projectRoot,
        packageJsonPath,
        packageName,
      );

      const options = {
        entryPoints: initialEntryPoints,
        projectRoot,
        packageName,
        packageJsonPath,
        tsConfigPath,
        assets: [],
      } as unknown as NormalizedLibraryOptions;

      const buildState = new BuilderState(options);
      buildState.previousBundleResults.set('.', createBundleResult());
      buildState.previousBundleResults.set('old-feature', createBundleResult());

      const newPackageJson: PackageJsonData = {
        name: packageName,
        exports: {
          '.': './src/public-api.ts',
          './new-feature': './new-feature/src/public-api.ts',
        },
      };

      updateWatchedEntryPoints(newPackageJson, options, buildState);

      expect(buildState.hasEntryPointsChanges).toBeTrue();
      expect(options.entryPoints.has('new-feature')).toBeTrue();
      expect(options.entryPoints.has('old-feature')).toBeFalse();
      expect(buildState.previousBundleResults.has('old-feature')).toBeFalse();
      expect(buildState.previousBundleResults.has('.')).toBeTrue();
      expect(
        buildState.watchedCompilationFiles.has(join(projectRoot, 'src/public-api.ts')),
      ).toBeTrue();
      expect(
        buildState.watchedCompilationFiles.has(join(projectRoot, 'old-feature/src/public-api.ts')),
      ).toBeFalse();
      expect(
        buildState.watchedCompilationFiles.has(join(projectRoot, 'new-feature/src/public-api.ts')),
      ).toBeTrue();
    });

    it('should not mutate buildState or options.entryPoints when entry points do not change', () => {
      const initialEntryPoints = normalizeEntryPoints(
        {
          '.': './src/public-api.ts',
          './feature': './feature/src/public-api.ts',
        },
        projectRoot,
        packageJsonPath,
        packageName,
      );

      const options = {
        entryPoints: initialEntryPoints,
        projectRoot,
        packageName,
        packageJsonPath,
        tsConfigPath,
        assets: [],
      } as unknown as NormalizedLibraryOptions;

      const buildState = new BuilderState(options);
      buildState.previousBundleResults.set('.', createBundleResult());
      buildState.previousBundleResults.set('feature', createBundleResult());

      const samePackageJson: PackageJsonData = {
        name: packageName,
        exports: {
          '.': './src/public-api.ts',
          './feature': './feature/src/public-api.ts',
        },
      };

      updateWatchedEntryPoints(samePackageJson, options, buildState);

      expect(buildState.hasEntryPointsChanges).toBeFalse();
      expect(options.entryPoints).toBe(initialEntryPoints);
      expect(buildState.previousBundleResults).toHaveSize(2);
    });

    it('should prune previousBundleResults when an entry point path changes', () => {
      const initialEntryPoints = normalizeEntryPoints(
        {
          '.': './src/public-api.ts',
        },
        projectRoot,
        packageJsonPath,
        packageName,
      );

      const options = {
        entryPoints: initialEntryPoints,
        projectRoot,
        packageName,
        packageJsonPath,
        tsConfigPath,
        assets: [],
      } as unknown as NormalizedLibraryOptions;

      const buildState = new BuilderState(options);
      buildState.previousBundleResults.set('.', createBundleResult());

      const updatedPackageJson: PackageJsonData = {
        name: packageName,
        exports: {
          '.': './src/other-api.ts',
        },
      };

      updateWatchedEntryPoints(updatedPackageJson, options, buildState);

      expect(buildState.hasEntryPointsChanges).toBeTrue();
      expect(buildState.previousBundleResults.has('.')).toBeFalse();
      expect(options.entryPoints.get('.')?.entryFilePath).toBe(
        join(projectRoot, 'src/other-api.ts'),
      );
      expect(
        buildState.watchedCompilationFiles.has(join(projectRoot, 'src/other-api.ts')),
      ).toBeTrue();
    });

    it('should prune previousBundleResults when an entry point bundleName changes', () => {
      const initialEntryPoints = normalizeEntryPoints(
        {
          '.': './src/public-api.ts',
        },
        projectRoot,
        packageJsonPath,
        packageName,
      );

      const options = {
        entryPoints: initialEntryPoints,
        projectRoot,
        packageName,
        packageJsonPath,
        tsConfigPath,
        assets: [],
      } as unknown as NormalizedLibraryOptions;

      const buildState = new BuilderState(options);
      buildState.previousBundleResults.set('.', createBundleResult());

      const updatedPackageJson: PackageJsonData = {
        name: '@renamed-scope/my-lib',
        exports: {
          '.': './src/public-api.ts',
        },
      };

      updateWatchedEntryPoints(updatedPackageJson, options, buildState);

      expect(buildState.hasEntryPointsChanges).toBeTrue();
      expect(buildState.previousBundleResults.has('.')).toBeFalse();
      expect(options.packageName).toBe('@renamed-scope/my-lib');
      expect(options.entryPoints.get('.')?.bundleName).toBe('renamed-scope-my-lib');
    });

    it('should throw when updated packageJson is missing a name field', () => {
      const options = {
        entryPoints: new Map(),
        projectRoot,
        packageName,
        packageJsonPath,
        assets: [],
      } as unknown as NormalizedLibraryOptions;
      const buildState = new BuilderState(options);

      expect(() =>
        updateWatchedEntryPoints({} as PackageJsonData, options, buildState),
      ).toThrowError(/must contain a 'name'/);
    });
  });

  describe('collectEntryPointsToBundle', () => {
    it('should return all entry points with ESM and DTS changes on initial build', () => {
      const entryPoints = normalizeEntryPoints(
        {
          '.': './src/public-api.ts',
          './testing': './testing/src/public-api.ts',
        },
        projectRoot,
        packageJsonPath,
        packageName,
      );
      const options = { entryPoints } as unknown as NormalizedLibraryOptions;
      const buildState = new BuilderState(options);

      const items = collectEntryPointsToBundle(options, buildState);

      expect(items).toHaveSize(2);
      expect(items[0]).toEqual({
        entryPoint: jasmine.objectContaining({ name: '.' }),
        previousBundleResult: undefined,
        hasEsmChanges: true,
        hasDtsChanges: true,
      });
      expect(items[1]).toEqual({
        entryPoint: jasmine.objectContaining({ name: 'testing' }),
        previousBundleResult: undefined,
        hasEsmChanges: true,
        hasDtsChanges: true,
      });
      expect(buildState.executionResult.logs).toEqual([
        'Compiling @my-scope/my-lib...',
        'Compiling @my-scope/my-lib/testing...',
      ]);
    });

    it('should only return entry points whose ESM or DTS module IDs intersect pending changes', () => {
      const entryPoints = normalizeEntryPoints(
        {
          '.': './src/public-api.ts',
          './testing': './testing/src/public-api.ts',
        },
        projectRoot,
        packageJsonPath,
        packageName,
      );
      const options = { entryPoints } as unknown as NormalizedLibraryOptions;
      const buildState = new BuilderState(options);

      const primaryEntryJs = join(projectRoot, 'src/public-api.js');
      const primaryEntryDts = join(projectRoot, 'src/public-api.d.ts');
      const testingEntryJs = join(projectRoot, 'testing/src/public-api.js');
      const testingEntryDts = join(projectRoot, 'testing/src/public-api.d.ts');

      buildState.previousBundleResults.set(
        '.',
        createBundleResult({
          esmModuleIds: new Set([primaryEntryJs]),
          dtsModuleIds: new Set([primaryEntryDts]),
        }),
      );
      buildState.previousBundleResults.set(
        'testing',
        createBundleResult({
          esmModuleIds: new Set([testingEntryJs]),
          dtsModuleIds: new Set([testingEntryDts]),
        }),
      );

      buildState.pendingChangedEsmFiles.add(testingEntryJs);

      const items = collectEntryPointsToBundle(options, buildState);

      expect(items).toHaveSize(1);
      expect(items[0]?.entryPoint.name).toBe('testing');
      expect(items[0]?.hasEsmChanges).toBeTrue();
      expect(items[0]?.hasDtsChanges).toBeFalse();
      expect(items[0]?.previousBundleResult).toBe(buildState.previousBundleResults.get('testing'));
      expect(buildState.executionResult.logs).toEqual(['Compiling @my-scope/my-lib/testing...']);
    });
  });
});
