/* jshint node: true */
'use strict';

var Promise = require('ember-cli/lib/ext/promise');
var Task = require('ember-cli/lib/models/task');
var exec = Promise.denodeify(require('child_process').exec);

module.exports = Task.extend({
  run: function () {
    var chalk = require('chalk');
    var ui = this.ui;

    return exec('npm run format')
      .then(function () {
        ui.writeLine(chalk.green('Successfully formatted files.'));
      })
      .catch(function (/*error*/) {
        ui.writeLine(chalk.red(
          'Couldn\'t do \'npm run format\'. Please check this script exists in your package.json.'));
      });
  }
});
