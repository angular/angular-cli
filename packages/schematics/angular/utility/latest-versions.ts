/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export const latestVersions = {
  // These versions should be kept up to date with latest Angular peer dependencies.
  Angular: '~10.0.0-rc.0',
  RxJs: '~6.6.0',
  ZoneJs: '~0.10.2',
  TypeScript: '~3.9.5',
  TsLib: '^2.0.0',

  // The versions below must be manually updated when making a new devkit release.
  // For our e2e tests, these versions must match the latest tag present on the branch.
  // During RC periods they will not match the latest RC until there's a new git tag, and
  // should not be updated.
  DevkitBuildAngular: '~0.1000.0-rc.0',
  DevkitBuildNgPackagr: '~0.1000.0-rc.0',
  DevkitBuildWebpack: '~0.1000.0-rc.0',

  ngPackagr: '^10.0.0',
};
