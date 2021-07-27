/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/** Retrieve the minor version for the provided version string. */
function getEarliestMinorVersion(version: string) {
  const versionMatching = version.match(/^(\d+)\.(\d+)\.*/);

  if (versionMatching === null) {
    throw Error('Unable to determine the minor version for the provided version');
  }
  const [_, major, minor] = versionMatching;

  return `${major}.${minor}.0`;
}

export const latestVersions = {
  // These versions should be kept up to date with latest Angular peer dependencies.
  RxJs: '~6.6.0',
  ZoneJs: '~0.11.4',
  TypeScript: '~4.3.2',
  TsLib: '^2.2.0',

  // As Angular CLI works with same minor versions of Angular Framework, a tilde match for the current
  // Angular CLI minor version will match the latest Angular Framework minor.
  Angular: `~${getEarliestMinorVersion(require('../package.json')['version'])}`,

  // Since @angular-devkit/build-angular and @schematics/angular are always
  // published together from the same monorepo, and they are both
  // non-experimental, they will always have the same version.
  DevkitBuildAngular: '~' + require('../package.json')['version'],

  ngPackagr: '^12.1.0',
};
