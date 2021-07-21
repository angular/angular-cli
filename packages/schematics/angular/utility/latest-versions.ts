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

export const latestVersions: Record<string, string> & {
  Angular: string;
  DevkitBuildAngular: string;
} = {
  // We could have used TypeScripts' `resolveJsonModule` to make the `latestVersion` object typesafe,
  // but ts_library doesn't support JSON inputs.
  ...require('./latest-versions/package.json')['dependencies'],

  // As Angular CLI works with same minor versions of Angular Framework, a tilde match for the current
  // Angular CLI minor version with earliest prerelease (appended with `-`) will match the latest
  // Angular Framework minor.
  Angular: `~${getEarliestMinorVersion(require('../package.json')['version'])}-`,

  // Since @angular-devkit/build-angular and @schematics/angular are always
  // published together from the same monorepo, and they are both
  // non-experimental, they will always have the same version.
  DevkitBuildAngular: '~' + require('../package.json')['version'],
};
