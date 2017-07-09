'use strict';

const fs = require('fs-extra');
const temp = require('temp');
const denodeify = require('denodeify');

const mkdirTemp = denodeify(temp.mkdir);

function mkTmpDirIn(dir) {
  return fs.pathExists(dir).then(doesExist => {
    if (!doesExist) {
      return fs.mkdir(dir);
    }
  }).then(() => mkdirTemp({ dir }));
}

module.exports = mkTmpDirIn;
