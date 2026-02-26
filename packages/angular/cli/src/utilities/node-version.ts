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

/**
 * The supported Node.js version for the Angular CLI.
 * @type {[string, number]} The supported Node.js version.
 */

const SUPPORTED_NODE_VERSIONS = '0.0.0-ENGINES-NODE';

/**
 * The supported Node.js versions.
 */
export const supportedNodeVersions = SUPPORTED_NODE_VERSIONS.replace(/[\^~<>=]/g, '')
  .split('||')
  .map((v) => v.trim());

/**
 * Checks if the current Node.js version is supported.
 * @returns `true` if the current Node.js version is supported, `false` otherwise.
 */
export function isNodeVersionSupported(): boolean {
  if (SUPPORTED_NODE_VERSIONS.charAt(0) === '0') {
    // Unlike `pkg_npm`, `ts_library` which is used to run unit tests does not support substitutions.
    return true;
  }

  const [processMajor, processMinor, processPatch] = process.versions.node
    .split('.', 3)
    .map((part) => Number(part));

  for (const version of supportedNodeVersions) {
    const [major, minor, patch] = version.split('.', 3).map((part) => Number(part));
    if (
      (major === processMajor && processMinor === minor && processPatch >= patch) ||
      (major === processMajor && processMinor > minor)
    ) {
      return true;
    }
  }

  return false;
}

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
