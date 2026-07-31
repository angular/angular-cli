/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'path';
import { resolveFallbackMigrations } from './cli';
import type { PackageVersionInfo, UpdatePlan } from './update-resolver';

describe('resolveFallbackMigrations', () => {
  let tempRoot: string;
  let pkgDir: string;
  beforeEach(async () => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    tempRoot = await mkdtemp(path.join(baseTmpDir, 'angular-cli-update-cli-test-'));
    pkgDir = path.join(tempRoot, 'node_modules/@company/library-name');
    await mkdir(pkgDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('discovers migrations from installed package.json when omitted from plan.migrationsToRun', async () => {
    await writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({
        name: '@company/library-name',
        version: '21.2.0-next.1',
        'ng-update': {
          migrations: './schematics/migration.json',
        },
      }),
      'utf8',
    );

    const plan: UpdatePlan = {
      packagesToUpdate: new Map([['@company/library-name', '21.2.0-next.1']]),
      migrationsToRun: [],
      packageInfoMap: new Map([
        [
          '@company/library-name',
          {
            name: '@company/library-name',
            npmPackageJson: {
              name: '@company/library-name',
              versions: ['21.1.0', '21.2.0-next.1'],
              'dist-tags': {},
            },
            installed: {
              version: '21.1.0' as unknown as PackageVersionInfo['version'],
              packageJson: { name: '@company/library-name', version: '21.1.0' },
              updateMetadata: { packageGroup: {}, requirements: {} },
            },
            packageJsonRange: '^21.1.0',
          },
        ],
      ]),
      registryClient: undefined as unknown as UpdatePlan['registryClient'],
    };

    const migrations = await resolveFallbackMigrations(tempRoot, plan);

    expect(migrations).toEqual([
      {
        package: '@company/library-name',
        collection: './schematics/migration.json',
        from: '21.1.0',
        to: '21.2.0-next.1',
      },
    ]);
  });

  it('does not duplicate migration if package is already in plan.migrationsToRun', async () => {
    await writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({
        name: '@company/library-name',
        version: '21.2.0-next.1',
        'ng-update': {
          migrations: './schematics/migration.json',
        },
      }),
      'utf8',
    );

    const plan: UpdatePlan = {
      packagesToUpdate: new Map([['@company/library-name', '21.2.0-next.1']]),
      migrationsToRun: [
        {
          package: '@company/library-name',
          collection: './schematics/migration.json',
          from: '21.1.0',
          to: '21.2.0-next.1',
        },
      ],
      packageInfoMap: new Map(),
      registryClient: undefined as unknown as UpdatePlan['registryClient'],
    };

    const migrations = await resolveFallbackMigrations(tempRoot, plan);

    expect(migrations).toHaveSize(1);
  });

  it('returns unchanged migrations when package has no ng-update field on disk', async () => {
    await writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({
        name: '@company/library-name',
        version: '21.2.0-next.1',
      }),
      'utf8',
    );

    const plan: UpdatePlan = {
      packagesToUpdate: new Map([['@company/library-name', '21.2.0-next.1']]),
      migrationsToRun: [],
      packageInfoMap: new Map(),
      registryClient: undefined as unknown as UpdatePlan['registryClient'],
    };

    const migrations = await resolveFallbackMigrations(tempRoot, plan);

    expect(migrations).toHaveSize(0);
  });
});
