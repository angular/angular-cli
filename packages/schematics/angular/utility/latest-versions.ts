/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// We could have used TypeScripts' `resolveJsonModule` to make the `latestVersion` object typesafe,
// but ts_library doesn't support JSON inputs.
const dependencies = require('./latest-versions/package.json')['dependencies'];

export const latestVersions: Record<string, string> & {
  Angular: string;
  DevkitBuildAngular: string;
  AngularBuild: string;
  AngularSSR: string;
  NgPackagr: string;
} = {
  ...dependencies,

  // As Angular CLI works with same minor versions of Angular Framework, a tilde match for the current
  Angular: '0.0.0-ANGULAR-FW-VERSION',
  NgPackagr: '0.0.0-NG-PACKAGR-VERSION',
  DevkitBuildAngular: '^0.0.0-PLACEHOLDER',
  AngularBuild: '^0.0.0-PLACEHOLDER',
  AngularSSR: '^0.0.0-PLACEHOLDER',
};
