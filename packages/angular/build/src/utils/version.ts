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
  let angularCliPkgJson;
  let angularPkgJson;

  // Create a custom require function for ESM compliance.
  // NOTE: The trailing slash is significant.
  const projectRequire = createRequire(projectRoot + '/');

  try {
    const angularPackagePath = projectRequire.resolve('@angular/core/package.json');

    angularPkgJson = projectRequire(angularPackagePath);
  } catch {
    console.error('You seem to not be depending on "@angular/core". This is an error.');

    process.exit(2);
  }

  if (!(angularPkgJson && angularPkgJson['version'])) {
    console.error(
      'Cannot determine versions of "@angular/core".\n' +
        'This likely means your local installation is broken. Please reinstall your packages.',
    );

    process.exit(2);
  }

  try {
    const angularCliPkgPath = projectRequire.resolve('@angular/cli/package.json');
    angularCliPkgJson = projectRequire(angularCliPkgPath);
    if (!(angularCliPkgJson && angularCliPkgJson['version'])) {
      return;
    }
  } catch {
    // Not using @angular-devkit/build-angular with @angular/cli is ok too.
    // In this case we don't provide as many version checks.
    return;
  }

  if (angularCliPkgJson['version'] === '0.0.0' || angularPkgJson['version'] === '0.0.0') {
    // Internal CLI testing version or integration testing in the angular/angular
    // repository with the generated development @angular/core npm package which is versioned "0.0.0".
    return;
  }

  const supportedAngularSemver = '0.0.0-ANGULAR-FW-PEER-DEP';
  const angularVersion = new SemVer(angularPkgJson['version']);

  if (!satisfies(angularVersion, supportedAngularSemver, { includePrerelease: true })) {
    console.error(
      `This version of CLI is only compatible with Angular versions ${supportedAngularSemver},\n` +
        `but Angular version ${angularVersion} was found instead.\n` +
        'Please visit the link below to find instructions on how to update Angular.\nhttps://update.angular.dev/',
    );

    process.exit(3);
  }
}
