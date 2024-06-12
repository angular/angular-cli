/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import Module, { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { NgAddSaveDependency } from './package-metadata';

interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  'ng-update'?: {
    migrations?: string;
  };
  'ng-add'?: {
    save?: NgAddSaveDependency;
  };
}

function getAllDependencies(pkg: PackageJson): Set<[string, string]> {
  return new Set([
    ...Object.entries(pkg.dependencies || []),
    ...Object.entries(pkg.devDependencies || []),
    ...Object.entries(pkg.peerDependencies || []),
    ...Object.entries(pkg.optionalDependencies || []),
  ]);
}

export interface PackageTreeNode {
  name: string;
  version: string;
  path: string;
  package: PackageJson | undefined;
}

export async function readPackageJson(packageJsonPath: string): Promise<PackageJson | undefined> {
  try {
    return JSON.parse((await readFile(packageJsonPath)).toString());
  } catch {
    return undefined;
  }
}

export function findPackageJson(workspaceDir: string, packageName: string): string | undefined {
  assert(
    '_pathCache' in Module && Module._pathCache && typeof Module._pathCache === 'object',
    `Node.js 'Module' does not contain '_pathCache'`,
  );

  // Avoid resolve cache problems, see: https://github.com/angular/angular-cli/pull/18610#issuecomment-681980185
  const originalPathCache = Module._pathCache;
  try {
    Module._pathCache = {};
    const workspaceRequire = createRequire(`${workspaceDir}/`);

    return workspaceRequire.resolve(`${packageName}/package.json`);
  } catch {
    return undefined;
  } finally {
    Module._pathCache = originalPathCache;
  }
}

export async function getProjectDependencies(dir: string): Promise<Map<string, PackageTreeNode>> {
  const pkg = await readPackageJson(join(dir, 'package.json'));
  if (!pkg) {
    throw new Error('Could not find package.json');
  }

  const results = new Map<string, PackageTreeNode>();
  for (const [name, version] of getAllDependencies(pkg)) {
    const packageJsonPath = findPackageJson(dir, name);
    if (!packageJsonPath) {
      continue;
    }

    results.set(name, {
      name,
      version,
      path: dirname(packageJsonPath),
      package: await readPackageJson(packageJsonPath),
    });
  }

  return results;
}
