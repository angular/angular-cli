/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Log, ReleasePrecheckError, bold } from '@angular/ng-dev';
import semver from 'semver';
import { checkSchematicsAngularLatestVersion } from './latest-versions-check.mjs';
import { PackageJson, checkPeerDependencies } from './peer-deps-check.mjs';

/** Environment variable that can be used to skip this pre-check. */
const skipEnvVar = 'SKIP_DEPENDENCY_RANGE_PRECHECK';

/**
 * Ensures that dependency ranges are properly updated before publishing
 * a new version. This check includes:
 *
 *   - checking of `latest-versions.ts` of `@schematics/angular`.
 *   - checking of peer dependencies in `@angular-devkit/build-angular`.
 *
 * @throws {ReleasePrecheckError} If validation fails.
 */
export async function assertValidDependencyRanges(
  newVersion: semver.SemVer,
  allPackages: PackageJson[],
) {
  if (process.env[skipEnvVar] === '1') {
    return;
  }

  const failures: string[] = [
    ...(await checkPeerDependencies(newVersion, allPackages)),
    // TODO: Re-enable the following once the checks are performed against the stamped `.js` file instead of the source `.json` file.
    // ...(await checkSchematicsAngularLatestVersion(newVersion)),
  ];

  if (failures.length !== 0) {
    Log.error('Discovered errors when validating dependency ranges.');

    for (const f of failures) {
      Log.error(`  - ${bold(f)}`);
    }

    Log.warn();
    Log.warn('Please fix these failures before publishing a new release.');
    Log.warn(`These checks can be forcibly ignored by setting: ${skipEnvVar}=1`);
    Log.warn();

    throw new ReleasePrecheckError();
  }
}
