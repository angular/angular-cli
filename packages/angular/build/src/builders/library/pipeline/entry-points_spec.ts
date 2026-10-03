/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join, resolve } from 'node:path';
import { toPosixPath } from '../../../utils/path';
import type {
  BundleResult,
  NormalizedEntryPoint,
  NormalizedLibraryOptions,
  PackageJsonData,
  SingleBuildState,
} from '../types';
import {
  getEntryPointBundleName,
  haveEntryPointsChanged,
  normalizeEntryPoints,
  updateWatchedEntryPoints,
} from './entry-points';

describe('entry-points pipeline', () => {
  const projectRoot = resolve('/workspace/projects/my-lib');
  const packageJsonPath = join(projectRoot, 'package.json');
  const packageName = '@my-scope/my-lib';

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
      } as unknown as NormalizedLibraryOptions;

      const buildState = {
        previousBundleResults: new Map<string, BundleResult>([
          ['.', { esmModuleIds: new Set(), dtsModuleIds: new Set() }],
          ['old-feature', { esmModuleIds: new Set(), dtsModuleIds: new Set() }],
        ]),
        hasEntryPointsChanges: false,
      } as unknown as SingleBuildState;

      const watchedCompilationFiles = new Set<string>();

      const newPackageJson: PackageJsonData = {
        name: packageName,
        exports: {
          '.': './src/public-api.ts',
          './new-feature': './new-feature/src/public-api.ts',
        },
      };

      updateWatchedEntryPoints(
        newPackageJson,
        options,
        buildState,
        watchedCompilationFiles,
        packageJsonPath,
      );

      expect(buildState.hasEntryPointsChanges).toBeTrue();
      expect(options.entryPoints.has('new-feature')).toBeTrue();
      expect(options.entryPoints.has('old-feature')).toBeFalse();
      expect(buildState.previousBundleResults.has('old-feature')).toBeFalse();
      expect(buildState.previousBundleResults.has('.')).toBeTrue();
      expect(
        watchedCompilationFiles.has(toPosixPath(join(projectRoot, 'src/public-api.ts'))),
      ).toBeTrue();
      expect(
        watchedCompilationFiles.has(
          toPosixPath(join(projectRoot, 'new-feature/src/public-api.ts')),
        ),
      ).toBeTrue();
    });

    it('should not mutate buildState or options when entry points do not change', () => {
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
      } as unknown as NormalizedLibraryOptions;

      const buildState = {
        previousBundleResults: new Map<string, BundleResult>([
          ['.', { esmModuleIds: new Set(), dtsModuleIds: new Set() }],
          ['feature', { esmModuleIds: new Set(), dtsModuleIds: new Set() }],
        ]),
        hasEntryPointsChanges: false,
      } as unknown as SingleBuildState;

      const watchedCompilationFiles = new Set<string>();

      const samePackageJson: PackageJsonData = {
        name: packageName,
        exports: {
          '.': './src/public-api.ts',
          './feature': './feature/src/public-api.ts',
        },
      };

      updateWatchedEntryPoints(
        samePackageJson,
        options,
        buildState,
        watchedCompilationFiles,
        packageJsonPath,
      );

      expect(buildState.hasEntryPointsChanges).toBeFalse();
      expect(options.entryPoints).toBe(initialEntryPoints);
      expect(watchedCompilationFiles).toHaveSize(0);
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
      } as unknown as NormalizedLibraryOptions;

      const buildState = {
        previousBundleResults: new Map<string, BundleResult>([
          ['.', { esmModuleIds: new Set(), dtsModuleIds: new Set() }],
        ]),
        hasEntryPointsChanges: false,
      } as unknown as SingleBuildState;

      const watchedCompilationFiles = new Set<string>();

      const updatedPackageJson: PackageJsonData = {
        name: packageName,
        exports: {
          '.': './src/other-api.ts',
        },
      };

      updateWatchedEntryPoints(
        updatedPackageJson,
        options,
        buildState,
        watchedCompilationFiles,
        packageJsonPath,
      );

      expect(buildState.hasEntryPointsChanges).toBeTrue();
      expect(buildState.previousBundleResults.has('.')).toBeFalse();
      expect(options.entryPoints.get('.')?.entryFilePath).toBe(
        join(projectRoot, 'src/other-api.ts'),
      );
      expect(
        watchedCompilationFiles.has(toPosixPath(join(projectRoot, 'src/other-api.ts'))),
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
      } as unknown as NormalizedLibraryOptions;

      const buildState = {
        previousBundleResults: new Map<string, BundleResult>([
          ['.', { esmModuleIds: new Set(), dtsModuleIds: new Set() }],
        ]),
        hasEntryPointsChanges: false,
      } as unknown as SingleBuildState;

      const watchedCompilationFiles = new Set<string>();

      const updatedPackageJson: PackageJsonData = {
        name: '@renamed-scope/my-lib',
        exports: {
          '.': './src/public-api.ts',
        },
      };

      options.packageName = updatedPackageJson.name;

      updateWatchedEntryPoints(
        updatedPackageJson,
        options,
        buildState,
        watchedCompilationFiles,
        packageJsonPath,
      );

      expect(buildState.hasEntryPointsChanges).toBeTrue();
      expect(buildState.previousBundleResults.has('.')).toBeFalse();
      expect(options.entryPoints.get('.')?.bundleName).toBe('renamed-scope-my-lib');
    });
  });
});
