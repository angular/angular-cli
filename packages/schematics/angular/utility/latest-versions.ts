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
  AngularSSR: string;
} = {
  // We could have used TypeScripts' `resolveJsonModule` to make the `latestVersion` object typesafe,
  // but ts_library doesn't support JSON inputs.
  ...require('./latest-versions/package.json')['dependencies'],

  // As Angular CLI works with same minor versions of Angular Framework, a tilde match for the current
  Angular: '^17.2.0',

  DevkitBuildAngular: '^0.0.0-PLACEHOLDER',
  AngularSSR: '^0.0.0-PLACEHOLDER',
};
