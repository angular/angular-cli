/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { PackageManager } from '../lib/config/schema';
import { getConfiguredPackageManager } from './config';

function supports(name: string): boolean {
  try {
    execSync(`${name} --version`, { stdio: 'ignore' });

    return true;
  } catch {
    return false;
  }
}

export function supportsYarn(): boolean {
  return supports('yarn');
}

export function supportsNpm(): boolean {
  return supports('npm');
}

export async function getPackageManager(root: string): Promise<PackageManager> {
  let packageManager = await getConfiguredPackageManager() as PackageManager | null;
  if (packageManager) {
    return packageManager;
  }

  const hasYarn = supportsYarn();
  const hasYarnLock = existsSync(join(root, 'yarn.lock'));
  const hasNpm = supportsNpm();
  const hasNpmLock = existsSync(join(root, 'package-lock.json'));

  if (hasYarn && hasYarnLock && !hasNpmLock) {
    packageManager = PackageManager.Yarn;
  } else if (hasNpm && hasNpmLock && !hasYarnLock) {
    packageManager = PackageManager.Npm;
  } else if (hasYarn && !hasNpm) {
    packageManager = PackageManager.Yarn;
  } else if (hasNpm && !hasYarn) {
    packageManager = PackageManager.Npm;
  }

  // TODO: This should eventually inform the user of ambiguous package manager usage.
  //       Potentially with a prompt to choose and optionally set as the default.
  return packageManager || PackageManager.Npm;
}
