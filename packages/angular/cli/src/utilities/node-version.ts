/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview This file contains the supported Node.js version for the Angular CLI.
 * @important This file must not import any other modules.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore strict-deps: #version is a subpath import mapped to bin/version.js
import { SUPPORTED_NODE_VERSIONS, supportedNodeVersions } from '#version';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore strict-deps: #version is a subpath import mapped to bin/version.js
export { SUPPORTED_NODE_VERSIONS, supportedNodeVersions, isNodeVersionSupported } from '#version';

/**
 * Checks if the current Node.js version is the minimum supported version.
 * @returns `true` if the current Node.js version is the minimum supported version, `false` otherwise.
 */
export function isNodeVersionMinSupported(): boolean {
  if (SUPPORTED_NODE_VERSIONS.charAt(0) === '0') {
    // Unlike `pkg_npm`, `ts_library` which is used to run unit tests does not support substitutions.
    return true;
  }

  const [processMajor, processMinor, processPatch] = process.versions.node
    .split('.', 3)
    .map((part) => Number(part));
  const [major, minor, patch] = supportedNodeVersions[0].split('.', 3).map((part) => Number(part));

  return (
    processMajor > major ||
    (processMajor === major && processMinor > minor) ||
    (processMajor === major && processMinor === minor && processPatch >= patch)
  );
}
