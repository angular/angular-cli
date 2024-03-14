/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import fastGlob from 'fast-glob';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface PackageInfo {
  name: string;
  root: string;
  experimental: boolean;
  packageJson: Record<string, boolean | number | string | object>;
}

function getPackages(): PackageInfo[] {
  const packages: PackageInfo[] = [];
  const monorepoData = JSON.parse(readFileSync('./.monorepo.json', 'utf-8'));

  for (const pkg of fastGlob.sync('./packages/*/*/package.json', { absolute: true })) {
    const packageJson = JSON.parse(readFileSync(pkg, 'utf-8'));

    if (!(packageJson.name in monorepoData.packages)) {
      throw new Error(`${packageJson.name} does not exist in .monorepo.json`);
    }

    packages.push({
      name: packageJson.name,
      experimental: !!packageJson.experimental,
      root: dirname(pkg),
      packageJson,
    });
  }

  return packages;
}

export const packages = getPackages();
export const releasePackages = packages.filter(({ packageJson }) => !packageJson.private);
