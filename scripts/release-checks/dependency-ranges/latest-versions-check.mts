/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import semver from 'semver';

export function checkSchematicsAngularLatestVersion(newVersion: semver.SemVer): string[] {
  // Root of the Angular CLI project.
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const rootRequire = createRequire(root);
  const { latestVersions } = rootRequire(
    './dist/releases/schematics/angular/utility/latest-versions.js',
  );

  const keysToCheck = ['Angular', 'NgPackagr'];
  const { major, minor, prerelease } = newVersion;
  const isPrerelease = !!prerelease[0];
  const failures: string[] = [];

  let expectedVersionDep = `^${major}.${minor}.0`;
  if (isPrerelease) {
    expectedVersionDep += '-next.0';
  }

  for (const key of keysToCheck) {
    const latestVersion = latestVersions[key];
    if (latestVersion !== expectedVersionDep) {
      failures.push(
        `latest-versions: Invalid dependency range for "${key}". Expected: ${expectedVersionDep} but got: ${latestVersion}`,
      );
    }
  }

  return failures;
}
