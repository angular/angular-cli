// Copyright Google Inc. All Rights Reserved.
// Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
// at https://angular.io/license
/* jshint node: true, esversion: 6 */
'use strict';

module.exports = function(name) {
  try {
    return require(name);
  } catch (e) {
    return null;
  }
};
