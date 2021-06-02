/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export const latestVersions = {
  // These versions should be kept up to date with latest Angular peer dependencies.
  Angular: '~12.0.3',
  RxJs: '~6.6.0',
  ZoneJs: '~0.11.4',
  TypeScript: '~4.2.3',
  TsLib: '^2.1.0',

  // Since @angular-devkit/build-angular and @schematics/angular are always
  // published together from the same monorepo, and they are both
  // non-experimental, they will always have the same version.
  DevkitBuildAngular: '~' + require('../package.json')['version'],

  ngPackagr: '^12.0.0',
};
