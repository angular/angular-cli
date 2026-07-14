/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import * as semver from 'semver';
import type { PackageManager, PackageManifest, PackageMetadata } from '../../package-managers';
import {
  RegistryClient,
  UpdateResolverOptions,
  angularMajorCompatGuarantee,
  applyUpdatePlan,
  resolveUserUpdatePlan,
} from './update-resolver';

describe('angularMajorCompatGuarantee', () => {
  [
    '5.0.0',
    '5.1.0',
    '5.20.0',
    '6.0.0',
    '6.0.0-rc.0',
    '6.0.0-beta.0',
    '6.1.0-beta.0',
    '6.1.0-rc.0',
    '6.10.11',
  ].forEach((golden) => {
    it('works with ' + JSON.stringify(golden), () => {
      expect(semver.satisfies(golden, angularMajorCompatGuarantee('^5.0.0'))).toBeTruthy();
    });
  });
});

describe('UpdateResolver', () => {
  let tempRoot: string;
  const logger = new logging.NullLogger();

  beforeEach(() => {
    tempRoot = mkdtempSync(path.join(tmpdir(), 'angular-cli-update-resolver-test-'));
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  const MOCK_REGISTRY: Record<
    string,
    {
      metadata: PackageMetadata;
      manifests: Record<string, PackageManifest>;
    }
  > = {
    '@angular-devkit-tests/update-base': {
      metadata: {
        name: '@angular-devkit-tests/update-base',
        'dist-tags': { latest: '1.1.0' },
        versions: ['1.0.0', '1.1.0'],
      },
      manifests: {
        '1.0.0': { name: '@angular-devkit-tests/update-base', version: '1.0.0' },
        '1.1.0': { name: '@angular-devkit-tests/update-base', version: '1.1.0' },
      },
    },
    '@angular-devkit-tests/update-peer-dependencies-angular-5': {
      metadata: {
        name: '@angular-devkit-tests/update-peer-dependencies-angular-5',
        'dist-tags': { latest: '1.0.0' },
        versions: ['1.0.0'],
      },
      manifests: {
        '1.0.0': {
          name: '@angular-devkit-tests/update-peer-dependencies-angular-5',
          version: '1.0.0',
          peerDependencies: {
            '@angular/core': '^5.0.0',
          },
        },
      },
    },
    '@angular-devkit-tests/update-package-group-1': {
      metadata: {
        name: '@angular-devkit-tests/update-package-group-1',
        'dist-tags': { latest: '1.2.0' },
        versions: ['1.0.0', '1.2.0'],
      },
      manifests: {
        '1.0.0': { name: '@angular-devkit-tests/update-package-group-1', version: '1.0.0' },
        '1.2.0': {
          name: '@angular-devkit-tests/update-package-group-1',
          version: '1.2.0',
          'ng-update': {
            packageGroup: {
              '@angular-devkit-tests/update-package-group-1': '',
              '@angular-devkit-tests/update-package-group-2': '^2',
            },
          },
        },
      },
    },
    '@angular-devkit-tests/update-package-group-2': {
      metadata: {
        name: '@angular-devkit-tests/update-package-group-2',
        'dist-tags': { latest: '2.0.0' },
        versions: ['1.0.0', '2.0.0'],
      },
      manifests: {
        '1.0.0': { name: '@angular-devkit-tests/update-package-group-2', version: '1.0.0' },
        '2.0.0': {
          name: '@angular-devkit-tests/update-package-group-2',
          version: '2.0.0',
          'ng-update': {
            packageGroup: {
              '@angular-devkit-tests/update-package-group-1': '^1',
              '@angular-devkit-tests/update-package-group-2': '',
            },
          },
        },
      },
    },
    '@angular/core': {
      metadata: {
        name: '@angular/core',
        'dist-tags': { latest: '6.0.0' },
        versions: ['5.1.0', '6.0.0'],
      },
      manifests: {
        '5.1.0': { name: '@angular/core', version: '5.1.0' },
        '6.0.0': { name: '@angular/core', version: '6.0.0' },
      },
    },
    'rxjs': {
      metadata: {
        name: 'rxjs',
        'dist-tags': { latest: '5.5.0' },
        versions: ['5.5.0'],
      },
      manifests: {
        '5.5.0': { name: 'rxjs', version: '5.5.0' },
      },
    },
    'zone.js': {
      metadata: {
        name: 'zone.js',
        'dist-tags': { latest: '0.8.26' },
        versions: ['0.8.26'],
      },
      manifests: {
        '0.8.26': { name: 'zone.js', version: '0.8.26' },
      },
    },
    '@angular-devkit-tests/update-release-age': {
      metadata: {
        name: '@angular-devkit-tests/update-release-age',
        'dist-tags': { latest: '1.2.0' },
        versions: ['1.0.0', '1.1.0', '1.2.0'],
        time: {
          '1.0.0': '2026-06-01T00:00:00.000Z',
          '1.1.0': new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          '1.2.0': new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      manifests: {
        '1.0.0': { name: '@angular-devkit-tests/update-release-age', version: '1.0.0' },
        '1.1.0': { name: '@angular-devkit-tests/update-release-age', version: '1.1.0' },
        '1.2.0': { name: '@angular-devkit-tests/update-release-age', version: '1.2.0' },
      },
    },
    '@angular-devkit-tests/core-bug': {
      metadata: {
        name: '@angular-devkit-tests/core-bug',
        'dist-tags': { latest: '14.0.0-next.0' },
        versions: ['12.2.0', '13.2.0', '14.0.0-next.0'],
      },
      manifests: {
        '12.2.0': { name: '@angular-devkit-tests/core-bug', version: '12.2.0' },
        '13.2.0': {
          name: '@angular-devkit-tests/core-bug',
          version: '13.2.0',
          'ng-update': {
            packageGroup: ['@angular-devkit-tests/core-bug', '@angular-devkit-tests/common-bug'],
          },
        },
        '14.0.0-next.0': { name: '@angular-devkit-tests/core-bug', version: '14.0.0-next.0' },
      },
    },
    '@angular-devkit-tests/common-bug': {
      metadata: {
        name: '@angular-devkit-tests/common-bug',
        'dist-tags': { latest: '14.0.0-next.0' },
        versions: ['12.2.0', '13.2.0', '14.0.0-next.0'],
      },
      manifests: {
        '12.2.0': { name: '@angular-devkit-tests/common-bug', version: '12.2.0' },
        '13.2.0': { name: '@angular-devkit-tests/common-bug', version: '13.2.0' },
        '14.0.0-next.0': { name: '@angular-devkit-tests/common-bug', version: '14.0.0-next.0' },
      },
    },
    '@angular-devkit-tests/cdk-bug': {
      metadata: {
        name: '@angular-devkit-tests/cdk-bug',
        'dist-tags': { latest: '14.0.0-next.0' },
        versions: ['12.2.0', '13.2.0', '14.0.0-next.0'],
      },
      manifests: {
        '12.2.0': {
          name: '@angular-devkit-tests/cdk-bug',
          version: '12.2.0',
          peerDependencies: {
            '@angular-devkit-tests/core-bug': '^12.0.0',
            '@angular-devkit-tests/common-bug': '^12.0.0',
          },
        },
        '13.2.0': {
          name: '@angular-devkit-tests/cdk-bug',
          version: '13.2.0',
          peerDependencies: {
            '@angular-devkit-tests/core-bug': '^13.0.0 || ^14.0.0-0',
            '@angular-devkit-tests/common-bug': '^13.0.0 || ^14.0.0-0',
          },
        },
        '14.0.0-next.0': { name: '@angular-devkit-tests/cdk-bug', version: '14.0.0-next.0' },
      },
    },
    '@types/web': {
      metadata: {
        name: '@types/web',
        'dist-tags': { latest: '0.0.100' },
        versions: ['0.0.99', '0.0.100'],
      },
      manifests: {
        '0.0.99': { name: '@types/web', version: '0.0.99' },
        '0.0.100': { name: '@types/web', version: '0.0.100' },
      },
    },
  };

  async function resolvePlan(options: UpdateResolverOptions, minReleaseAge = 0) {
    const mockPackageManager = {
      name: 'npm',
      async getRegistryMetadata(packageName: string) {
        return MOCK_REGISTRY[packageName]?.metadata ?? null;
      },
      async getRegistryManifest(packageName: string, version: string) {
        return MOCK_REGISTRY[packageName]?.manifests[version] ?? null;
      },
      async getMinimumReleaseAge() {
        return minReleaseAge;
      },
    } as unknown as PackageManager;

    return resolveUserUpdatePlan(options, mockPackageManager, logger);
  }

  function createMockWorkspace(
    packageJson: Record<string, unknown>,
    nodeModules: { [name: string]: { version: string; manifest?: Record<string, unknown> } } = {},
  ) {
    writeFileSync(path.join(tempRoot, 'package.json'), JSON.stringify(packageJson, null, 2));
    for (const [name, info] of Object.entries(nodeModules)) {
      const pkgDir = path.join(tempRoot, 'node_modules', name);
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        path.join(pkgDir, 'package.json'),
        JSON.stringify({ name, version: info.version, ...info.manifest }, null, 2),
      );
    }
  }

  it('ignores dependencies not hosted on the NPM registry', async () => {
    createMockWorkspace({
      name: 'blah',
      dependencies: {
        '@angular-devkit-tests/update-base': 'file:update-base-1.0.0.tgz',
      },
    });

    const plan = await resolvePlan({
      packages: [],
      workspaceRoot: tempRoot,
    });

    expect(plan.packagesToUpdate.size).toBe(0);
  });

  it('should not error with yarn 2.0 protocols', async () => {
    createMockWorkspace(
      {
        name: 'blah',
        dependencies: {
          src: 'src@link:./src',
          '@angular-devkit-tests/update-base': '1.0.0',
        },
      },
      {
        '@angular-devkit-tests/update-base': { version: '1.0.0' },
      },
    );

    const plan = await resolvePlan({
      packages: ['@angular-devkit-tests/update-base'],
      workspaceRoot: tempRoot,
    });

    expect(plan.packagesToUpdate.get('@angular-devkit-tests/update-base')).toBe('1.1.0');
  });

  it('updates Angular as compatible with Angular N-1', async () => {
    createMockWorkspace(
      {
        name: 'blah',
        dependencies: {
          '@angular-devkit-tests/update-peer-dependencies-angular-5': '1.0.0',
          '@angular/core': '5.1.0',
          rxjs: '5.5.0',
          'zone.js': '0.8.26',
        },
      },
      {
        '@angular-devkit-tests/update-peer-dependencies-angular-5': { version: '1.0.0' },
        '@angular/core': { version: '5.1.0' },
        rxjs: { version: '5.5.0' },
        'zone.js': { version: '0.8.26' },
      },
    );

    const plan = await resolvePlan({
      packages: ['@angular/core@^6.0.0'],
      workspaceRoot: tempRoot,
    });

    expect(plan.packagesToUpdate.get('@angular/core')?.[0]).toBe('6');
  });

  it('uses packageGroup for versioning', async () => {
    createMockWorkspace(
      {
        name: 'blah',
        dependencies: {
          '@angular-devkit-tests/update-package-group-1': '1.0.0',
          '@angular-devkit-tests/update-package-group-2': '1.0.0',
        },
      },
      {
        '@angular-devkit-tests/update-package-group-1': { version: '1.0.0' },
        '@angular-devkit-tests/update-package-group-2': { version: '1.0.0' },
      },
    );

    const plan = await resolvePlan({
      packages: ['@angular-devkit-tests/update-package-group-1'],
      workspaceRoot: tempRoot,
    });

    expect(plan.packagesToUpdate.get('@angular-devkit-tests/update-package-group-1')).toBe('1.2.0');
    expect(plan.packagesToUpdate.get('@angular-devkit-tests/update-package-group-2')).toBe('2.0.0');
  });

  it('does not remove newline at the end of package.json', async () => {
    const newline = '\n';
    const packageJsonContent = `{
  "name": "blah",
  "dependencies": {
    "@angular-devkit-tests/update-base": "1.0.0"
  }
}${newline}`;

    writeFileSync(path.join(tempRoot, 'package.json'), packageJsonContent);

    // Mock installed package
    const pkgDir = path.join(tempRoot, 'node_modules', '@angular-devkit-tests/update-base');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: '@angular-devkit-tests/update-base', version: '1.0.0' }, null, 2),
    );

    const plan = await resolvePlan({
      packages: ['@angular-devkit-tests/update-base'],
      workspaceRoot: tempRoot,
    });

    await applyUpdatePlan(tempRoot, plan, logger);

    const result = readFileSync(path.join(tempRoot, 'package.json'), 'utf8');
    expect(result.endsWith(newline)).toBeTrue();
  });

  it('does not add a newline at the end of package.json', async () => {
    const packageJsonContent = `{
  "name": "blah",
  "dependencies": {
    "@angular-devkit-tests/update-base": "1.0.0"
  }
}`;

    writeFileSync(path.join(tempRoot, 'package.json'), packageJsonContent);

    // Mock installed package
    const pkgDir = path.join(tempRoot, 'node_modules', '@angular-devkit-tests/update-base');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: '@angular-devkit-tests/update-base', version: '1.0.0' }, null, 2),
    );

    const plan = await resolvePlan({
      packages: ['@angular-devkit-tests/update-base'],
      workspaceRoot: tempRoot,
    });

    await applyUpdatePlan(tempRoot, plan, logger);

    const result = readFileSync(path.join(tempRoot, 'package.json'), 'utf8');
    expect(result.endsWith('}')).toBeTrue();
  });

  it('respects minimumReleaseAge and filters out versions published too recently', async () => {
    createMockWorkspace(
      {
        name: 'blah',
        dependencies: {
          '@angular-devkit-tests/update-release-age': '1.0.0',
        },
      },
      {
        '@angular-devkit-tests/update-release-age': { version: '1.0.0' },
      },
    );

    const planNoFilter = await resolvePlan(
      {
        packages: ['@angular-devkit-tests/update-release-age'],
        workspaceRoot: tempRoot,
      },
      0,
    );

    expect(planNoFilter.packagesToUpdate.get('@angular-devkit-tests/update-release-age')).toBe(
      '1.2.0',
    );

    const planWithFilter = await resolvePlan(
      {
        packages: ['@angular-devkit-tests/update-release-age'],
        workspaceRoot: tempRoot,
      },
      3 * 24 * 60 * 60 * 1000,
    );

    expect(planWithFilter.packagesToUpdate.get('@angular-devkit-tests/update-release-age')).toBe(
      '1.1.0',
    );
  });

  it('correctly keeps packageGroup version when updating alongside peer dependencies', async () => {
    createMockWorkspace(
      {
        name: 'blah',
        dependencies: {
          '@angular-devkit-tests/core-bug': '12.2.0',
          '@angular-devkit-tests/common-bug': '12.2.0',
          '@angular-devkit-tests/cdk-bug': '12.2.0',
        },
      },
      {
        '@angular-devkit-tests/core-bug': { version: '12.2.0' },
        '@angular-devkit-tests/common-bug': { version: '12.2.0' },
        '@angular-devkit-tests/cdk-bug': { version: '12.2.0' },
      },
    );

    const plan = await resolvePlan({
      packages: ['@angular-devkit-tests/cdk-bug@13', '@angular-devkit-tests/core-bug@13'],
      workspaceRoot: tempRoot,
    });

    expect(plan.packagesToUpdate.get('@angular-devkit-tests/core-bug')).toBe('13.2.0');
    expect(plan.packagesToUpdate.get('@angular-devkit-tests/common-bug')).toBe('13.2.0');
    expect(plan.packagesToUpdate.get('@angular-devkit-tests/cdk-bug')).toBe('13.2.0');
  });

  it('rejects updates for catalog packages and guides on manual migration steps', async () => {
    createMockWorkspace(
      {
        name: 'blah',
        dependencies: {
          '@angular/core': 'catalog:',
        },
      },
      {
        '@angular/core': { version: '5.1.0' },
      },
    );

    const expectedError = `
The following packages to update are configured to use \`catalog:\`:
  - @angular/core \\(catalog:\\) -> Target version: 6\\.0\\.0

Because catalogs are shared across the monorepo, 'ng update' cannot modify them directly\\.
Please perform the following steps to update:
  1\\. Manually update the versions for these packages in your catalog.*
  2\\. Run 'pnpm install' to install the updated versions\\.
  3\\. Run the following command\\(s\\) from the workspace root to execute the migration schematics:
  ng update @angular/core --migrate-only --from 5\\.1\\.0
    `.trim();

    await expectAsync(
      resolvePlan({
        packages: ['@angular/core'],
        workspaceRoot: tempRoot,
      }),
    ).toBeRejectedWithError(new RegExp(expectedError));
  });

  it('rejects updates for catalog packages specified with a version suffix', async () => {
    createMockWorkspace(
      {
        name: 'blah',
        dependencies: {
          '@angular/core': 'catalog:',
        },
      },
      {
        '@angular/core': { version: '5.1.0' },
      },
    );

    const expectedError = `
The following packages to update are configured to use \`catalog:\`:
  - @angular/core \\(catalog:\\) -> Target version: 6\\.0\\.0

Because catalogs are shared across the monorepo, 'ng update' cannot modify them directly\\.
Please perform the following steps to update:
  1\\. Manually update the versions for these packages in your catalog.*
  2\\. Run 'pnpm install' to install the updated versions\\.
  3\\. Run the following command\\(s\\) from the workspace root to execute the migration schematics:
  ng update @angular/core --migrate-only --from 5\\.1\\.0
    `.trim();

    await expectAsync(
      resolvePlan({
        packages: ['@angular/core@6'],
        workspaceRoot: tempRoot,
      }),
    ).toBeRejectedWithError(new RegExp(expectedError));
  });

  it('rejects updates for catalog packages specified with a named catalog', async () => {
    createMockWorkspace(
      {
        name: 'blah',
        dependencies: {
          '@angular/core': 'catalog:framework',
        },
      },
      {
        '@angular/core': { version: '5.1.0' },
      },
    );

    const expectedError = `
The following packages to update are configured to use \`catalog:\`:
  - @angular/core \\(catalog:framework\\) -> Target version: 6\\.0\\.0

Because catalogs are shared across the monorepo, 'ng update' cannot modify them directly\\.
Please perform the following steps to update:
  1\\. Manually update the versions for these packages in your catalog.*
  2\\. Run 'pnpm install' to install the updated versions\\.
  3\\. Run the following command\\(s\\) from the workspace root to execute the migration schematics:
  ng update @angular/core --migrate-only --from 5\\.1\\.0
    `.trim();

    await expectAsync(
      resolvePlan({
        packages: ['@angular/core'],
        workspaceRoot: tempRoot,
      }),
    ).toBeRejectedWithError(new RegExp(expectedError));
  });

  it('correctly resolves and updates packages using npm alias syntax', async () => {
    createMockWorkspace(
      {
        name: 'blah',
        dependencies: {
          '@typescript/lib-dom': 'npm:@types/web@^0.0.99',
        },
      },
      {
        '@typescript/lib-dom': {
          version: '0.0.99',
          manifest: { name: '@types/web' },
        },
      },
    );

    const plan = await resolvePlan({
      packages: ['@typescript/lib-dom'],
      workspaceRoot: tempRoot,
    });

    expect(plan.packagesToUpdate.get('@typescript/lib-dom')).toBe('0.0.100');

    await applyUpdatePlan(tempRoot, plan, logger);

    const updatedPackageJson = JSON.parse(
      readFileSync(path.join(tempRoot, 'package.json'), 'utf8'),
    ) as PackageManifest;

    expect(updatedPackageJson.dependencies?.['@typescript/lib-dom']).toBe(
      'npm:@types/web@^0.0.100',
    );
  });

  it('correctly handles packages using npm alias syntax without a version range', async () => {
    createMockWorkspace(
      {
        name: 'blah',
        dependencies: {
          '@typescript/lib-dom': 'npm:@types/web',
        },
      },
      {
        '@typescript/lib-dom': {
          version: '0.0.99',
          manifest: { name: '@types/web' },
        },
      },
    );

    const plan = await resolvePlan({
      packages: ['@typescript/lib-dom'],
      workspaceRoot: tempRoot,
    });

    expect(plan.packagesToUpdate.get('@typescript/lib-dom')).toBe('0.0.100');

    await applyUpdatePlan(tempRoot, plan, logger);

    const updatedPackageJson = JSON.parse(
      readFileSync(path.join(tempRoot, 'package.json'), 'utf8'),
    ) as PackageManifest;

    expect(updatedPackageJson.dependencies?.['@typescript/lib-dom']).toBe('npm:@types/web');
  });
});

describe('RegistryClient', () => {
  const logger = new logging.NullLogger();

  it('should cache metadata requests', async () => {
    let callCount = 0;
    const mockPackageManager = {
      async getRegistryMetadata() {
        callCount++;

        return { name: 'test-pkg', 'dist-tags': {}, versions: [] };
      },
    } as unknown as PackageManager;

    const client = new RegistryClient(mockPackageManager, logger);
    const m1 = await client.getMetadata('test-pkg');
    const m2 = await client.getMetadata('test-pkg');

    expect(callCount).toBe(1);
    expect(m1).toEqual(m2);
  });

  it('should evict metadata requests from cache upon failure', async () => {
    let callCount = 0;
    const mockPackageManager = {
      async getRegistryMetadata() {
        callCount++;
        if (callCount === 1) {
          throw new Error('Transient error');
        }

        return { name: 'test-pkg', 'dist-tags': {}, versions: [] };
      },
    } as unknown as PackageManager;

    const client = new RegistryClient(mockPackageManager, logger);

    await expectAsync(client.getMetadata('test-pkg')).toBeRejectedWithError('Transient error');
    const m2 = await client.getMetadata('test-pkg');

    expect(callCount).toBe(2);
    expect(m2).not.toBeNull();
    expect(m2?.name).toBe('test-pkg');
  });

  it('should cache manifest requests', async () => {
    let callCount = 0;
    const mockPackageManager = {
      async getRegistryManifest() {
        callCount++;

        return { name: 'test-pkg', version: '1.0.0' };
      },
    } as unknown as PackageManager;

    const client = new RegistryClient(mockPackageManager, logger);
    const m1 = await client.getManifest('test-pkg', '1.0.0');
    const m2 = await client.getManifest('test-pkg', '1.0.0');

    expect(callCount).toBe(1);
    expect(m1).toEqual(m2);
  });

  it('should evict manifest requests from cache upon failure', async () => {
    let callCount = 0;
    const mockPackageManager = {
      async getRegistryManifest() {
        callCount++;
        if (callCount === 1) {
          throw new Error('Transient error');
        }

        return { name: 'test-pkg', version: '1.0.0' };
      },
    } as unknown as PackageManager;

    const client = new RegistryClient(mockPackageManager, logger);

    await expectAsync(client.getManifest('test-pkg', '1.0.0')).toBeRejectedWithError(
      'Transient error',
    );
    const m2 = await client.getManifest('test-pkg', '1.0.0');

    expect(callCount).toBe(2);
    expect(m2).not.toBeNull();
    expect(m2?.version).toBe('1.0.0');
  });
});
