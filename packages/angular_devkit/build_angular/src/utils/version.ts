/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/* eslint-disable no-console */

import { tags } from '@angular-devkit/core';
import { SemVer, satisfies } from 'semver';

export function assertCompatibleAngularVersion(projectRoot: string): void | never {
  let angularCliPkgJson;
  let angularPkgJson;
  const resolveOptions = { paths: [projectRoot] };

  try {
    const angularPackagePath = require.resolve('@angular/core/package.json', resolveOptions);

    angularPkgJson = require(angularPackagePath);
  } catch {
    console.error(tags.stripIndents`
      You seem to not be depending on "@angular/core". This is an error.
    `);

    process.exit(2);
  }

  if (!(angularPkgJson && angularPkgJson['version'])) {
    console.error(tags.stripIndents`
      Cannot determine versions of "@angular/core".
      This likely means your local installation is broken. Please reinstall your packages.
    `);

    process.exit(2);
  }

  try {
    const angularCliPkgPath = require.resolve('@angular/cli/package.json', resolveOptions);
    angularCliPkgJson = require(angularCliPkgPath);
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

  const supportedAngularSemver =
    require('../../package.json')['peerDependencies']['@angular/compiler-cli'];
  const angularVersion = new SemVer(angularPkgJson['version']);

  if (!satisfies(angularVersion, supportedAngularSemver, { includePrerelease: true })) {
    console.error(
      tags.stripIndents`
        This version of CLI is only compatible with Angular versions ${supportedAngularSemver},
        but Angular version ${angularVersion} was found instead.

        Please visit the link below to find instructions on how to update Angular.
        https://update.angular.io/
      ` + '\n',
    );

    process.exit(3);
  }
}
