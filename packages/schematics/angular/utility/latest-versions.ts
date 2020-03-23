/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export const latestVersions = {
  // These versions should be kept up to date with latest Angular peer dependencies.
  Angular: '~9.1.0-next.5',
  RxJs: '~6.5.4',
  ZoneJs: '~0.10.2',
  TypeScript: '~3.8.3',
  TsLib: '^1.10.0',

  // The versions below must be manually updated when making a new devkit release.
  // For our e2e tests, these versions must match the latest tag present on the branch.
  // During RC periods they will not match the latest RC until there's a new git tag, and
  // should not be updated.
  DevkitBuildAngular: '~0.901.0-next.4',
  DevkitBuildNgPackagr: '~0.901.0-next.4',
  DevkitBuildWebpack: '~0.901.0-next.4',

  ngPackagr: '^9.0.0',
};
