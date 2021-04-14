/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export const latestVersions = {
  // These versions should be kept up to date with latest Angular peer dependencies.
  Angular: '~12.0.0-next.9',
  RxJs: '~6.6.0',
  ZoneJs: '~0.11.4',
  TypeScript: '~4.2.3',
  TsLib: '^2.1.0',

  // The versions below must be manually updated when making a new devkit release.
  // For our e2e tests, these versions must match the latest tag present on the branch.
  // During RC periods they will not match the latest RC until there's a new git tag, and
  // should not be updated.
  DevkitBuildAngular: '~12.0.0-rc.0',

  ngPackagr: '^12.0.0-next.8',
};
