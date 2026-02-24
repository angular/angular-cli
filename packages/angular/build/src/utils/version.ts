/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable no-console */

import { createRequire } from 'node:module';
import { SemVer, satisfies } from 'semver';

export function assertCompatibleAngularVersion(projectRoot: string): void | never {
  let angularPkgJson;

  // Create a custom require function for ESM compliance.
  // NOTE: The trailing slash is significant.
  const projectRequire = createRequire(projectRoot + '/');

  try {
    angularPkgJson = projectRequire('@angular/core/package.json');
  } catch {
    console.error(
      'Error: It appears that "@angular/core" is missing as a dependency. Please ensure it is included in your project.',
    );

    process.exit(2);
  }

  if (!angularPkgJson?.['version']) {
    console.error(
      'Error: Unable to determine the versions of "@angular/core".\n' +
        'This likely indicates a corrupted local installation. Please try reinstalling your packages.',
    );

    process.exit(2);
  }

  const angularCoreSemVer = new SemVer(angularPkgJson['version']);
  const { version, build, raw } = angularCoreSemVer;
  const supportedAngularSemver = '0.0.0-ANGULAR-FW-PEER-DEP';

  if (version.startsWith('0.0.0') || supportedAngularSemver.startsWith('0.0.0')) {
    // Internal CLI and FW testing version.
    return;
  }

  if (build.length && version.endsWith('.0.0-next.0')) {
    // Special handle for local builds only when it's prerelease of major version and it's the 0th version.
    // This happends when we are bumping to a new major version. and the cli has not releated a verion.

    // Example:
    // raw: '22.0.0-next.0+sha-c7dc705-with-local-changes',
    // major: 22,
    // minor: 0,
    // patch: 0,
    // prerelease: [ 'next', 0 ],
    // build: [ 'sha-c7dc705-with-local-changes' ],
    // version: '22.0.0-next.0'

    return;
  }

  if (!satisfies(angularCoreSemVer, supportedAngularSemver, { includePrerelease: true })) {
    console.error(
      `Error: The current version of "@angular/build" supports Angular versions ${supportedAngularSemver},\n` +
        `but detected Angular version ${raw} instead.\n` +
        'Please visit the link below to find instructions on how to update Angular.\nhttps://update.angular.dev/',
    );

    process.exit(3);
  }
}
