/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { InstalledPackage } from '../../package-managers';
import { supplementWithLocalDependencies } from './cli';

/**
 * Creates a minimal on-disk fixture that simulates an npm workspace member:
 *
 *   <projectRoot>/
 *     package.json          ← Angular project manifest (workspace member)
 *     node_modules/
 *       <depName>/
 *         package.json      ← installed package manifest
 */
async function createWorkspaceMemberFixture(options: {
  projectDeps: Record<string, string>;
  installedPackages: Array<{ name: string; version: string }>;
}): Promise<string> {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ng-update-spec-'));

  // Write the Angular project's package.json
  await fs.writeFile(
    path.join(projectRoot, 'package.json'),
    JSON.stringify({
      name: 'test-app',
      version: '0.0.0',
      dependencies: options.projectDeps,
    }),
  );

  // Write each installed package into node_modules
  for (const pkg of options.installedPackages) {
    // Support scoped packages like @angular/core
    const pkgDir = path.join(projectRoot, 'node_modules', ...pkg.name.split('/'));
    await fs.mkdir(pkgDir, { recursive: true });
    await fs.writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: pkg.name, version: pkg.version }),
    );
  }

  return projectRoot;
}

describe('supplementWithLocalDependencies', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('should add packages from the local package.json that are missing from the dependency map', async () => {
    // Simulates an npm workspace member where `npm list` (run against the
    // workspace root) did not return `@angular/core`, even though it is
    // declared in the member's package.json and installed in node_modules.
    tmpDir = await createWorkspaceMemberFixture({
      projectDeps: { '@angular/core': '^21.0.0' },
      installedPackages: [{ name: '@angular/core', version: '21.2.4' }],
    });

    const deps = new Map<string, InstalledPackage>();

    await supplementWithLocalDependencies(deps, tmpDir);

    expect(deps.has('@angular/core')).toBeTrue();
    expect(deps.get('@angular/core')?.version).toBe('21.2.4');
  });

  it('should not overwrite a package that is already present in the dependency map', async () => {
    tmpDir = await createWorkspaceMemberFixture({
      projectDeps: { '@angular/core': '^21.0.0' },
      installedPackages: [{ name: '@angular/core', version: '21.2.4' }],
    });

    // The package manager already returned a version for @angular/core.
    const existingEntry: InstalledPackage = { name: '@angular/core', version: '21.0.0' };
    const deps = new Map<string, InstalledPackage>([['@angular/core', existingEntry]]);

    await supplementWithLocalDependencies(deps, tmpDir);

    // The existing entry must not be overwritten.
    expect(deps.get('@angular/core')).toBe(existingEntry);
    expect(deps.get('@angular/core')?.version).toBe('21.0.0');
  });

  it('should skip packages that are declared in package.json but not installed in node_modules', async () => {
    tmpDir = await createWorkspaceMemberFixture({
      projectDeps: { 'not-installed': '^1.0.0' },
      installedPackages: [],
    });

    const deps = new Map<string, InstalledPackage>();

    await supplementWithLocalDependencies(deps, tmpDir);

    // Package is not installed; should not be added.
    expect(deps.has('not-installed')).toBeFalse();
  });

  it('should handle devDependencies and peerDependencies in addition to dependencies', async () => {
    tmpDir = await createWorkspaceMemberFixture({
      projectDeps: {},
      installedPackages: [
        { name: 'rxjs', version: '7.8.2' },
        { name: 'zone.js', version: '0.15.0' },
      ],
    });

    // Write a package.json that uses devDependencies and peerDependencies.
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'test-app',
        version: '0.0.0',
        devDependencies: { 'zone.js': '~0.15.0' },
        peerDependencies: { rxjs: '~7.8.0' },
      }),
    );

    const deps = new Map<string, InstalledPackage>();

    await supplementWithLocalDependencies(deps, tmpDir);

    expect(deps.has('zone.js')).toBeTrue();
    expect(deps.get('zone.js')?.version).toBe('0.15.0');
    expect(deps.has('rxjs')).toBeTrue();
    expect(deps.get('rxjs')?.version).toBe('7.8.2');
  });

  it('should do nothing when the project root has no package.json', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ng-update-spec-'));

    const deps = new Map<string, InstalledPackage>();

    // Should resolve without throwing.
    await expectAsync(supplementWithLocalDependencies(deps, tmpDir)).toBeResolved();
    expect(deps.size).toBe(0);
  });
});
