/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFile } from 'node:fs/promises';
import semver from 'semver';

export async function checkSchematicsAngularLatestVersion(
  newVersion: semver.SemVer,
): Promise<string[]> {
  const { dependencies } = JSON.parse(
    await readFile('./packages/schematics/angular/utility/latest-versions/package.json', 'utf-8'),
  );

  const keysToCheck = ['ng-packagr', '@angular/core'];
  const { major, minor } = newVersion;
  const isPrerelease = !!newVersion.prerelease[0];
  const failures: string[] = [];

  let expectedFwDep = `^${major}.${minor}.0`;
  if (isPrerelease) {
    expectedFwDep = `^${major}.${minor}.0-next.0`;
  }

  for (const key of keysToCheck) {
    if (dependencies[key] !== expectedFwDep) {
      failures.push(
        `latest-versions: Invalid dependency range for "${key}". Expected: ${expectedFwDep}`,
      );
    }
  }

  return failures;
}
