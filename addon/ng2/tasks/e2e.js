/* jshint node: true */
'use strict';

var Promise = require('ember-cli/lib/ext/promise');
var Task = require('ember-cli/lib/models/task');
var exec = Promise.denodeify(require('shelljs').exec);

module.exports = Task.extend({
  run: function() {
    return exec('npm run e2e');
  }
});
