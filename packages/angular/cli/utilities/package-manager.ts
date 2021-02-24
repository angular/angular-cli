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
import { satisfies, valid } from 'semver';
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

/**
 * Checks if the npm version is a supported 7.x version.  If not, display a warning.
 */
export async function ensureCompatibleNpm(root: string): Promise<void> {
  if ((await getPackageManager(root)) !== PackageManager.Npm) {
    return;
  }

  try {
    const versionText = execSync('npm --version', {encoding: 'utf8', stdio: 'pipe'}).trim();
    const version = valid(versionText);
    if (!version) {
      return;
    }

    if (satisfies(version, '>=7 <7.5.6')) {
      // tslint:disable-next-line: no-console
      console.warn(
        `npm version ${version} detected.` +
          ' When using npm 7 with the Angular CLI, npm version 7.5.6 or higher is recommended.',
      );
    }
  } catch {
    // npm is not installed
  }
}
