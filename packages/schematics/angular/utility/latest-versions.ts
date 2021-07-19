/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export const latestVersions: Record<string, string> & {
  Angular: string;
  DevkitBuildAngular: string;
} = {
  // We could have used TypeScripts' `resolveJsonModule` to make the `latestVersion` object typesafe,
  // but ts_library doesn't support JSON inputs.
  ...require('./latest-versions/package.json')['dependencies'],

  // These versions should be kept up to date with latest Angular peer dependencies.
  Angular: '~12.2.0-next.2',

  // Since @angular-devkit/build-angular and @schematics/angular are always
  // published together from the same monorepo, and they are both
  // non-experimental, they will always have the same version.
  DevkitBuildAngular: '~' + require('../package.json')['version'],
};
