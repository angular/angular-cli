/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as fs from 'fs';
import { dirname, join } from 'path';
import * as resolve from 'resolve';
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
  installConfig?: {
    pnp?: boolean;
  };
}

interface YarnPnp {
  resolveRequest: (request: string, issuer: string) => string | null;
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
    return JSON.parse((await fs.promises.readFile(packageJsonPath)).toString()) as PackageJson;
  } catch {
    return undefined;
  }
}

export function findPackageJson(
  workspaceDir: string,
  packageName: string,
  usingPnP = false,
): string | undefined {
  if (usingPnP) {
    if (fs.existsSync(join(workspaceDir, '.pnp.js'))) {
      const pnp: YarnPnp = require(join(workspaceDir, '.pnp.js'));
      const packageJsonPath = pnp.resolveRequest(`${packageName}/package.json`, workspaceDir);

      return packageJsonPath ?? undefined;
    } else {
      throw new Error("Could not find .pnp.js of Yarn Plug'n'Play");
    }
  }
  try {
    // avoid require.resolve here, see: https://github.com/angular/angular-cli/pull/18610#issuecomment-681980185
    const packageJsonPath = resolve.sync(`${packageName}/package.json`, { basedir: workspaceDir });

    return packageJsonPath;
  } catch {
    return undefined;
  }
}

export async function getProjectDependencies(dir: string): Promise<Map<string, PackageTreeNode>> {
  const pkg = await readPackageJson(join(dir, 'package.json'));
  if (!pkg) {
    throw new Error('Could not find package.json');
  }
  const usingPnP = !!pkg.installConfig?.pnp;
  const results = new Map<string, PackageTreeNode>();
  for (const [name, version] of getAllDependencies(pkg)) {
    const packageJsonPath = findPackageJson(dir, name, usingPnP);
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
