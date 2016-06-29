// Copyright Google Inc. All Rights Reserved.
// Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
// at https://angular.io/license
'use strict';

var fs = require('fs-extra');
var existsSync = require('exists-sync');
var Promise = require('ember-cli/lib/ext/promise');
var remove = Promise.denodeify(fs.remove);
var root = process.cwd();

module.exports.setup = function (path) {
  process.chdir(root);

  return remove(path).then(function () {
    fs.mkdirsSync(path);
  });
};

module.exports.teardown = function (path) {
  process.chdir(root);

  if (existsSync(path)) {
    return remove(path);
  } else {
    return Promise.resolve();
  }
};
