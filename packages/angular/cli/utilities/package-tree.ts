/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import { dirname, join } from 'path';
import * as resolve from 'resolve';
import { promisify } from 'util';
import { NgAddSaveDepedency } from './package-metadata';

const readFile = promisify(fs.readFile);

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
    save?: NgAddSaveDepedency;
  };
}

async function readJSON(file: string) {
  const buffer = await readFile(file);

  return JSON.parse(buffer.toString());
}

function getAllDependencies(pkg: PackageJson) {
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
    return await readJSON(packageJsonPath);
  } catch (err) {
    return undefined;
  }
}

export function findPackageJson(workspaceDir: string, packageName: string) {
  try {
    // avoid require.resolve here, see: https://github.com/angular/angular-cli/pull/18610#issuecomment-681980185
    const packageJsonPath = resolve.sync(`${packageName}/package.json`, { paths: [workspaceDir] });

    return packageJsonPath;
  } catch (err) {
    return undefined;
  }
}

export async function getProjectDependencies(dir: string) {
  const pkgJsonPath = resolve.sync(join(dir, `package.json`));
  if (!pkgJsonPath) {
    throw new Error('Could not find package.json');
  }

  const pkg: PackageJson = await readJSON(pkgJsonPath);

  const results = new Map<string, PackageTreeNode>();
  await Promise.all(
    Array.from(getAllDependencies(pkg)).map(async ([name, version]) => {
      const packageJsonPath = findPackageJson(dir, name);
      if (packageJsonPath) {
        const currentDependency = {
          name,
          version,
          path: dirname(packageJsonPath),
          package: await readPackageJson(packageJsonPath),
        };

        results.set(currentDependency.name, currentDependency);
      }
    }),
  );

  return results;
}
