/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

declare module 'npm-pick-manifest' {
  function pickManifest(
    metadata: import('./utilities/package-metadata').PackageMetadata,
    selector: string,
  ): import('./utilities/package-metadata').PackageManifest;
  export = pickManifest;
}
