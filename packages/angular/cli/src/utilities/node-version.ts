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

import { SUPPORTED_NODE_VERSIONS, supportedNodeVersions } from '#version';

export {
  SUPPORTED_NODE_VERSIONS,
  supportedNodeVersions,
  isNodeVersionSupported,
  isNodeVersionRunnable,
} from '#version';

/**
 * Checks if the current Node.js version is the minimum supported version.
 * @param currentVersion Optional Node.js version string to check. Defaults to `process.versions.node`.
 * @param supportedVersions Optional supported versions array. Defaults to `supportedNodeVersions`.
 * @returns `true` if the current Node.js version is the minimum supported version, `false` otherwise.
 */
export function isNodeVersionMinSupported(
  currentVersion = process.versions.node,
  supportedVersions = supportedNodeVersions,
): boolean {
  if (SUPPORTED_NODE_VERSIONS.charAt(0) === '0' && currentVersion === process.versions.node) {
    // Unlike `pkg_npm`, `ts_library` which is used to run unit tests does not support substitutions.
    return true;
  }

  const [processMajor, processMinor, processPatch] = currentVersion
    .split('.', 3)
    .map((part) => Number(part));
  const [major, minor, patch] = supportedVersions[0].split('.', 3).map((part) => Number(part));

  return (
    processMajor > major ||
    (processMajor === major && processMinor > minor) ||
    (processMajor === major && processMinor === minor && processPatch >= patch)
  );
}
