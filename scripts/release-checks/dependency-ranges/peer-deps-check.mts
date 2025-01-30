/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import semver from 'semver';

/** Path to the current directory. */

/** Describes a parsed `package.json` file. */
export interface PackageJson {
  name?: string;
  peerDependencies?: Record<string, string>;
}

export function checkPeerDependencies(
  newVersion: semver.SemVer,
  allPackages: PackageJson[],
): string[] {
  const { major, minor, prerelease } = newVersion;
  const isPrerelease = !!prerelease[0];
  const isMajor = minor === 0;

  let expectedFwPeerDep = `^${major}.0.0`;
  if (isMajor && isPrerelease) {
    expectedFwPeerDep += ` || ^${major}.0.0-next.0`;
  } else if (isPrerelease) {
    expectedFwPeerDep += ` || ^${major}.${minor}.0-next.0`;
  }

  const failures: string[] = [];
  for (const pkgInfo of allPackages) {
    failures.push(...checkPackage(pkgInfo, expectedFwPeerDep));
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
        `${pkgJson.name}: Unexpected peer dependency range for "${depName}". Expected: ${expectedFwPeerDep} but got: ${range}`,
      );
    }
  }

  return failures;
}
