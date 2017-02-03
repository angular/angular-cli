'use strict';

var Promise   = require('../ext/promise');
var fs        = require('fs-extra');
var temp      = require('temp');
var mkdir     = Promise.denodeify(fs.mkdir);
var mkdirTemp = Promise.denodeify(temp.mkdir);

function exists(dir) {
  return new Promise(function(resolve) {
    fs.exists(dir, resolve);
  });
}

function mkTmpDirIn(dir) {
  return exists(dir).then(function(doesExist) {
    if (!doesExist) {
      return mkdir(dir);
    }
  }).then(function() {
    return mkdirTemp({ dir: dir });
  });
}

module.exports = mkTmpDirIn;
