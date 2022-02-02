/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { exec as execCb, execSync } from 'child_process';
import { constants, promises as fs } from 'fs';
import { join } from 'path';
import { satisfies, valid } from 'semver';
import { promisify } from 'util';
import { PackageManager } from '../lib/config/workspace-schema';
import { getConfiguredPackageManager } from './config';

const exec = promisify(execCb);
async function supports(name: PackageManager): Promise<boolean> {
  try {
    await exec(`${name} --version`);

    return true;
  } catch {
    return false;
  }
}

async function hasLockfile(root: string, packageManager: PackageManager): Promise<boolean> {
  try {
    let lockfileName: string;
    switch (packageManager) {
      case PackageManager.Yarn:
        lockfileName = 'yarn.lock';
        break;
      case PackageManager.Pnpm:
        lockfileName = 'pnpm-lock.yaml';
        break;
      case PackageManager.Npm:
      default:
        lockfileName = 'package-lock.json';
        break;
    }

    await fs.access(join(root, lockfileName), constants.F_OK);

    return true;
  } catch {
    return false;
  }
}

export async function getPackageManager(root: string): Promise<PackageManager> {
  const packageManager = await getConfiguredPackageManager();
  if (packageManager) {
    return packageManager;
  }

  const [hasYarnLock, hasNpmLock, hasPnpmLock] = await Promise.all([
    hasLockfile(root, PackageManager.Yarn),
    hasLockfile(root, PackageManager.Npm),
    hasLockfile(root, PackageManager.Pnpm),
  ]);

  const hasYarn = await supports(PackageManager.Yarn);
  if (hasYarn && hasYarnLock && !hasNpmLock) {
    return PackageManager.Yarn;
  }

  const hasPnpm = await supports(PackageManager.Pnpm);
  if (hasPnpm && hasPnpmLock && !hasNpmLock) {
    return PackageManager.Pnpm;
  }

  const hasNpm = await supports(PackageManager.Npm);
  if (hasNpm && hasNpmLock && !hasYarnLock && !hasPnpmLock) {
    return PackageManager.Npm;
  }

  if (hasYarn && !hasNpm && !hasPnpm) {
    return PackageManager.Yarn;
  }

  if (hasPnpm && !hasYarn && !hasNpm) {
    return PackageManager.Pnpm;
  }

  // TODO: This should eventually inform the user of ambiguous package manager usage.
  //       Potentially with a prompt to choose and optionally set as the default.
  return PackageManager.Npm;
}

/**
 * Checks if the npm version is a supported 7.x version.  If not, display a warning.
 */
export async function ensureCompatibleNpm(root: string): Promise<void> {
  if ((await getPackageManager(root)) !== PackageManager.Npm) {
    return;
  }

  try {
    const versionText = execSync('npm --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
    const version = valid(versionText);
    if (!version) {
      return;
    }

    if (satisfies(version, '>=7 <7.5.6')) {
      // eslint-disable-next-line no-console
      console.warn(
        `npm version ${version} detected.` +
          ' When using npm 7 with the Angular CLI, npm version 7.5.6 or higher is recommended.',
      );
    }
  } catch {
    // npm is not installed
  }
}
