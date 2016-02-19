/* jshint node: true */
'use strict';

var Promise = require('ember-cli/lib/ext/promise');
var sh = require('shelljs');

module.exports = function shellPromise(command) {
  return new Promise(function(resolve, reject) {
    return sh.exec(command, {
      silent: true
    }, function(code, stdout, stderr) {
      if (code !== 0) reject(stderr);
      else resolve(stdout);
    });
  });
};
