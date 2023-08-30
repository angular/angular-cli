/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import path from 'path';
import url from 'url';
import semver from 'semver';
import { PackageMap } from '../../../lib/packages.js';

/** Path to the current directory. */
const currentDir = path.dirname(url.fileURLToPath(import.meta.url));

/** Path to the project directory. */
const projectDir = path.join(currentDir, '../../../');

/** Describes a parsed `package.json` file. */
interface PackageJson {
  name?: string;
  peerDependencies?: Record<string, string>;
}

export async function checkPeerDependencies(
  newVersion: semver.SemVer,
  allPackages: PackageMap,
): Promise<string[]> {
  const { major, minor } = newVersion;
  const isPrerelease = !!newVersion.prerelease[0];
  const isMajor = minor === 0;

  let expectedFwPeerDep = `^${major}.0.0`;
  if (isMajor && isPrerelease) {
    expectedFwPeerDep += ` || ^${major}.0.0-next.0`;
  } else if (isPrerelease) {
    expectedFwPeerDep += ` || ^${major}.${minor}.0-next.0`;
  }

  const failures: string[] = [];
  for (const pkgInfo of Object.values(allPackages)) {
    failures.push(...checkPackage(pkgInfo.packageJson, expectedFwPeerDep));
  }

  return failures;
}

/** Checks the given package and collects errors for the peer dependency ranges. */
function checkPackage(pkgJson: PackageJson, expectedFwPeerDep: string): string[] {
  if (pkgJson.peerDependencies === undefined) {
    return [];
  }

  const failures: string[] = [];

  for (const [depName, range] of Object.entries(pkgJson.peerDependencies)) {
    // Even though `ng-packagr` might not strictly follow the same release schedules
    // like official Angular packages, we generally expect it to match. It's better
    // flagging it than silently passing pre-checks. The caretaker can always forcibly
    // ignore this check.
    if (!depName.startsWith('@angular/') && depName !== 'ng-packagr') {
      continue;
    }

    if (range !== expectedFwPeerDep) {
      failures.push(
        `${pkgJson.name}: Unexpected peer dependency range for "${depName}". Expected: ${expectedFwPeerDep}`,
      );
    }
  }

  return failures;
}
