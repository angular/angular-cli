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
 * Checks if the current Node.js version is supported.
 * @returns `true` if the current Node.js version is supported, `false` otherwise.
 */
function isNodeVersionSupported() {
  if (SUPPORTED_NODE_VERSIONS.charAt(0) === '0') {
    return true;
  }

  var parts = process.versions.node.split('.', 3).map(Number);
  var processMajor = parts[0];
  var processMinor = parts[1];
  var processPatch = parts[2];

  for (var i = 0; i < supportedNodeVersions.length; i++) {
    var vParts = supportedNodeVersions[i].split('.', 3).map(Number);
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

module.exports = {
  VERSION: VERSION,
  SUPPORTED_NODE_VERSIONS: SUPPORTED_NODE_VERSIONS,
  supportedNodeVersions: supportedNodeVersions,
  isNodeVersionSupported: isNodeVersionSupported,
};
