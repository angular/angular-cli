/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { join } from 'node:path';
import type { NormalizedEntryPoint, NormalizedLibraryOptions, PackageJsonData } from '../options';
import { getEntryPointBundleName } from './entry-points';
import { generatePackageManifests } from './package-manifests';
import type { MemoryOutputFile } from './utils';

describe('generatePackageManifests', () => {
  const tempDir = '/workspace/my-lib';

  function getRootPackageJson(files: MemoryOutputFile[]): PackageJsonData {
    const file = files.find((f) => f.path === 'package.json');
    assert(file, 'package.json must be present in emitted files');

    return JSON.parse(String(file.contents)) as PackageJsonData;
  }

  function createEntryPoints(
    packageName = 'my-lib',
    includeSecondary = false,
  ): Map<string, NormalizedEntryPoint> {
    const entryPoints = new Map<string, NormalizedEntryPoint>();
    const primaryBundleName = getEntryPointBundleName(packageName);
    entryPoints.set('.', {
      subpath: '.',
      name: '.',
      displayName: packageName,
      bundleName: primaryBundleName,
      entryFilePath: join(tempDir, 'src/public-api.ts'),
      isPrimary: true,
    });

    if (includeSecondary) {
      const secondaryBundleName = getEntryPointBundleName(packageName, 'testing');
      entryPoints.set('testing', {
        subpath: './testing',
        name: 'testing',
        displayName: `${packageName}/testing`,
        bundleName: secondaryBundleName,
        entryFilePath: join(tempDir, 'testing/src/public-api.ts'),
        isPrimary: false,
      });
    }

    return entryPoints;
  }

  function createOptions(
    overrides: Partial<NormalizedLibraryOptions> = {},
    includeSecondary = false,
  ): NormalizedLibraryOptions {
    const packageName =
      (overrides.packageJson?.name as string | undefined) ?? overrides.packageName ?? 'my-lib';

    return {
      workspaceRoot: tempDir,
      projectRoot: tempDir,
      packageName,
      packageJson: {
        name: packageName,
      },
      outputPath: '',
      deleteOutputPath: true,
      packageJsonPath: join(tempDir, 'package.json'),
      tsConfigPath: join(tempDir, 'tsconfig.lib.json'),
      entryPoints: overrides.entryPoints ?? createEntryPoints(packageName, includeSecondary),
      inlineStyleLanguage: 'css',
      styleIncludePaths: [],
      assets: [],
      compilationMode: 'partial',
      declarationMap: false,
      allowedNonPeerDependencies: [],
      keepLifecycleScripts: false,
      watch: false,
      preserveSymlinks: false,
      progress: false,
      colors: false,
      cacheOptions: {
        enabled: false,
        basePath: '',
        path: '',
        cacheId: '',
      } as unknown as NormalizedLibraryOptions['cacheOptions'],
      ...overrides,
    };
  }

  it('should generate a valid APF package.json for an unscoped package', () => {
    const options = createOptions({
      packageJson: {
        name: 'my-lib',
        version: '1.0.0',
        description: 'A test library',
        devDependencies: {
          typescript: '^5.0.0',
        },
        scripts: {
          test: 'npm run test',
        },
      },
    });

    const files = generatePackageManifests(options, false);
    const result = getRootPackageJson(files);

    expect(result).toEqual({
      name: 'my-lib',
      version: '1.0.0',
      description: 'A test library',
      type: 'module',
      sideEffects: false,
      main: './fesm2022/my-lib.mjs',
      module: './fesm2022/my-lib.mjs',
      typings: './types/my-lib.d.ts',
      types: './types/my-lib.d.ts',
      exports: {
        './package.json': { default: './package.json' },
        '.': {
          types: './types/my-lib.d.ts',
          default: './fesm2022/my-lib.mjs',
        },
      },
    });
  });

  it('should sanitize scoped package names in fesm and types paths', () => {
    const options = createOptions({
      packageJson: {
        name: '@my-scope/my-lib',
        version: '2.1.0',
      },
    });

    const files = generatePackageManifests(options, false);
    const result = getRootPackageJson(files);

    expect(result).toEqual(
      jasmine.objectContaining({
        name: '@my-scope/my-lib',
        module: './fesm2022/my-scope-my-lib.mjs',
        typings: './types/my-scope-my-lib.d.ts',
        types: './types/my-scope-my-lib.d.ts',
        exports: jasmine.objectContaining({
          '.': {
            types: './types/my-scope-my-lib.d.ts',
            default: './fesm2022/my-scope-my-lib.mjs',
          },
        }),
      }),
    );
  });

  it('should retain scripts when keepLifecycleScripts is true', () => {
    const options = createOptions({
      keepLifecycleScripts: true,
      packageJson: {
        name: 'my-lib',
        version: '1.0.0',
        scripts: {
          postinstall: 'echo done',
        },
      },
    });

    const files = generatePackageManifests(options, false);
    const result = getRootPackageJson(files);
    expect(result.scripts).toEqual({ postinstall: 'echo done' });
  });

  it('should configure secondary entry points and create secondary manifests', () => {
    const options = createOptions(
      {
        packageJson: {
          name: '@my-scope/my-lib',
          version: '1.0.0',
        },
      },
      true,
    );

    const files = generatePackageManifests(options, false);
    const result = getRootPackageJson(files);

    expect(result.exports).toEqual(
      jasmine.objectContaining({
        './testing': {
          types: './types/my-scope-my-lib-testing.d.ts',
          default: './fesm2022/my-scope-my-lib-testing.mjs',
        },
      }),
    );

    const secondaryPkgFile = files.find((f) => f.path === 'testing/package.json');
    const secondaryPkg = JSON.parse(String(secondaryPkgFile?.contents ?? ''));
    expect(secondaryPkg).toEqual({
      module: '../fesm2022/my-scope-my-lib-testing.mjs',
      typings: '../types/my-scope-my-lib-testing.d.ts',
      types: '../types/my-scope-my-lib-testing.d.ts',
    });

    const npmignoreFile = files.find((f) => f.path === '.npmignore');
    expect(npmignoreFile?.contents).toContain('/testing/package.json');
  });

  it('should inject watch version when isWatchMode is true', () => {
    const options = createOptions({
      packageJson: {
        name: 'my-lib',
        version: '1.0.0',
      },
    });

    const files = generatePackageManifests(options, true);
    const result = getRootPackageJson(files);
    expect(result.version).toMatch(/^0\.0\.0-watch\+\d+$/);
  });

  it('should throw an error if primary entry point is missing', () => {
    const options = createOptions({
      packageJson: {
        name: 'my-lib',
        version: '1.0.0',
      },
      entryPoints: new Map(),
    });

    expect(() => generatePackageManifests(options, false)).toThrowError(
      /Primary entry point '\.' was not found in entryPoints\./,
    );
  });

  it('should inject prepublishOnly guard script when compilationMode is full', () => {
    const options = createOptions({
      compilationMode: 'full',
      packageJson: {
        name: 'my-lib',
        version: '1.0.0',
      },
    });

    const files = generatePackageManifests(options, false);
    const result = getRootPackageJson(files);
    expect(result.scripts?.['prepublishOnly']).toContain(
      'Trying to publish a package that has been compiled in full compilation mode',
    );
  });

  it('should preserve custom user exports in package.json and merge subpath conditions', () => {
    const options = createOptions({
      packageJson: {
        name: 'my-lib',
        version: '1.0.0',
        exports: {
          './styles.css': './styles.css',
          './scss/*': './scss/*',
          '.': {
            development: './src/index.ts',
          },
        },
      },
    });

    const files = generatePackageManifests(options, false);
    const result = getRootPackageJson(files);

    expect(result.exports).toEqual({
      './styles.css': './styles.css',
      './scss/*': './scss/*',
      './package.json': { default: './package.json' },
      '.': {
        types: './types/my-lib.d.ts',
        development: './src/index.ts',
        default: './fesm2022/my-lib.mjs',
      },
    });
  });

  it('should default sideEffects to false if not specified, and preserve when set', () => {
    const files1 = generatePackageManifests(
      createOptions({
        packageJson: {
          name: 'my-lib',
          version: '1.0.0',
        },
      }),
      false,
    );
    expect(getRootPackageJson(files1).sideEffects).toBeFalse();

    const files2 = generatePackageManifests(
      createOptions({
        packageJson: {
          name: 'my-lib',
          version: '1.0.0',
          sideEffects: ['*.css'],
        },
      }),
      false,
    );
    expect(getRootPackageJson(files2).sideEffects).toEqual(['*.css']);
  });
});
