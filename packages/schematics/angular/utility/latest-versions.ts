/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export const latestVersions = {
  // These versions should be kept up to date with latest Angular peer dependencies.
  Angular: '~12.1.0',
  RxJs: '~6.6.0',
  ZoneJs: '~0.11.4',
  TypeScript: '~4.3.2',
  TsLib: '^2.2.0',

  // Since @angular-devkit/build-angular and @schematics/angular are always
  // published together from the same monorepo, and they are both
  // non-experimental, they will always have the same version.
  DevkitBuildAngular: '~' + require('../package.json')['version'],

  ngPackagr: '^12.1.0-next.0',
};
