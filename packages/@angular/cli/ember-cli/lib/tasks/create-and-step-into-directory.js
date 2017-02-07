'use strict';

// Creates a directory with the name directoryName in cwd and then sets cwd to
// this directory.

var Promise     = require('../ext/promise');
var fs          = require('fs');
var mkdir       = Promise.denodeify(fs.mkdir);
var Task        = require('../models/task');
var SilentError = require('silent-error');

function existsSync(path) {
  try {
    fs.accessSync(path);
    return true;
  }
  catch (e) {
    return false;
  }
}

module.exports = Task.extend({
  // Options: String directoryName, Boolean: dryRun

  warnDirectoryAlreadyExists: function warnDirectoryAlreadyExists() {
    var message = 'Directory \'' + this.directoryName + '\' already exists.';
    return new SilentError(message);
  },

  run: function(options) {
    var directoryName = this.directoryName = options.directoryName;
    if (options.dryRun) {
      return new Promise(function(resolve, reject) {
        if (existsSync(directoryName)) {
          return reject(this.warnDirectoryAlreadyExists());
        }
        resolve();
      }.bind(this));
    }

    return mkdir(directoryName)
      .catch(function(err) {
        if (err.code === 'EEXIST') {
          throw this.warnDirectoryAlreadyExists();
        } else {
          throw err;
        }
      }.bind(this))
      .then(function() {
        var cwd = process.cwd();
        process.chdir(directoryName);
        return { initialDirectory: cwd };
      });
  }
});
