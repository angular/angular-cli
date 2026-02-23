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

// Matches exactly '0.0.0' or any string ending in '.0.0-next.0'
// This allows FW to bump the package.json to a new major version without requiring a new CLI version.
const angularVersionRegex = /^0\.0\.0$|\.0\.0-next\.0$/;

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

  const supportedAngularSemver = '0.0.0-ANGULAR-FW-PEER-DEP';
  if (
    angularVersionRegex.test(angularPkgJson['version']) ||
    supportedAngularSemver.startsWith('0.0.0')
  ) {
    // Internal CLI and FW testing version.
    return;
  }

  const angularVersion = new SemVer(angularPkgJson['version']);

  if (!satisfies(angularVersion, supportedAngularSemver, { includePrerelease: true })) {
    console.error(
      `Error: The current version of "@angular/build" supports Angular versions ${supportedAngularSemver},\n` +
        `but detected Angular version ${angularVersion} instead.\n` +
        'Please visit the link below to find instructions on how to update Angular.\nhttps://update.angular.dev/',
    );

    process.exit(3);
  }
}
