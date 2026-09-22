'use strict';
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * The supported Node.js version for the Angular CLI.
 */
var SUPPORTED_NODE_VERSIONS = '0.0.0-ENGINES-NODE';

/**
 * The version of the Angular CLI.
 */
var VERSION = '0.0.0-PLACEHOLDER';

/**
 * The supported Node.js versions.
 */
var supportedNodeVersions = SUPPORTED_NODE_VERSIONS.replace(/[\^~<>=]/g, '')
  .split('||')
  .map(function (v) {
    return v.trim();
  });

/**
 * Checks if the current Node.js version is officially supported.
 * @param {string} [currentVersion] Optional Node.js version string to check. Defaults to `process.versions.node`.
 * @param {string[]} [supportedVersions] Optional supported versions array. Defaults to `supportedNodeVersions`.
 * @returns {boolean} `true` if the current Node.js version is officially supported, `false` otherwise.
 */
function isNodeVersionSupported(currentVersion, supportedVersions) {
  if (SUPPORTED_NODE_VERSIONS.charAt(0) === '0' && !supportedVersions && !currentVersion) {
    return true;
  }

  var parts = (currentVersion || process.versions.node).split('.', 3).map(Number);
  var processMajor = parts[0];
  var processMinor = parts[1];
  var processPatch = parts[2];

  var versions = supportedVersions || supportedNodeVersions;
  for (var i = 0; i < versions.length; i++) {
    var vParts = versions[i].split('.', 3).map(Number);
    var major = vParts[0];
    var minor = vParts[1];
    var patch = vParts[2];
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
 * Checks if the current Node.js version is runnable (newer than supported LTS or an interim odd release).
 * @param {string} [currentVersion] Optional Node.js version string to check. Defaults to `process.versions.node`.
 * @param {string[]} [supportedVersions] Optional supported versions array. Defaults to `supportedNodeVersions`.
 * @returns {boolean} `true` if the current Node.js version is runnable, `false` otherwise.
 */
function isNodeVersionRunnable(currentVersion, supportedVersions) {
  if (SUPPORTED_NODE_VERSIONS.charAt(0) === '0' && !supportedVersions && !currentVersion) {
    return false;
  }

  var processMajor = Number((currentVersion || process.versions.node).split('.', 1)[0]);
  var versions = supportedVersions || supportedNodeVersions;

  var minMajor = Number(versions[0].split('.', 1)[0]);
  var maxMajor = Number(versions[versions.length - 1].split('.', 1)[0]);

  // Versions newer than the maximum supported major (e.g. Node 27, 28+)
  if (processMajor > maxMajor) {
    return true;
  }

  // Odd-numbered interim releases between min and max (e.g. Node 23, 25)
  if (processMajor > minMajor && processMajor % 2 === 1) {
    return true;
  }

  return false;
}

module.exports = {
  VERSION: VERSION,
  SUPPORTED_NODE_VERSIONS: SUPPORTED_NODE_VERSIONS,
  supportedNodeVersions: supportedNodeVersions,
  isNodeVersionSupported: isNodeVersionSupported,
  isNodeVersionRunnable: isNodeVersionRunnable,
};
