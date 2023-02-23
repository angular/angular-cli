/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import semver from 'semver';

export async function checkSchematicsAngularLatestVersion(
  newVersion: semver.SemVer,
): Promise<string[]> {
  const {
    default: { latestVersions },
  } = await import('../../../packages/schematics/angular/utility/latest-versions.js');

  const keysToCheck = ['ng-packagr', 'Angular'];
  const { major, minor } = newVersion;
  const isPrerelease = !!newVersion.prerelease[0];
  const failures: string[] = [];

  let expectedFwDep = `^${major}.${minor}.0`;
  if (isPrerelease) {
    expectedFwDep = `^${major}.${minor}.0-next.0`;
  }

  for (const key of keysToCheck) {
    if (latestVersions[key] !== expectedFwDep) {
      failures.push(
        `latest-versions: Invalid dependency range for "${key}". Expected: ${expectedFwDep}`,
      );
    }
  }

  return failures;
}
