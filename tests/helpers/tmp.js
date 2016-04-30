'use strict';

var fs = require('fs-extra');
var Promise = require('ember-cli/lib/ext/promise');
var root = process.cwd();

module.exports.setup = function (path) {
  process.chdir(root);
  fs.removeSync(path);
  fs.ensureDirSync(path);

  return Promise.resolve();
};

module.exports.teardown = function (path) {
  process.chdir(root);
  fs.removeSync(path);

  return Promise.resolve();
};
