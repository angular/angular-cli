'use strict';

const fs = require('fs-extra');
const temp = require('temp');
const RSVP = require('rsvp');

const Promise = RSVP.Promise;
const mkdir = RSVP.denodeify(fs.mkdir);
const mkdirTemp = RSVP.denodeify(temp.mkdir);

function exists(dir) {
  return new Promise(resolve => {
    fs.exists(dir, resolve);
  });
}

function mkTmpDirIn(dir) {
  return exists(dir).then(doesExist => {
    if (!doesExist) {
      return mkdir(dir);
    }
  }).then(() => mkdirTemp({ dir }));
}

module.exports = mkTmpDirIn;
