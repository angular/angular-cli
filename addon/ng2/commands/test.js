'use strict';

var Promise = require('ember-cli/lib/ext/promise');
var TestCommand = require('ember-cli/lib/commands/test');
var win = require('ember-cli/lib/utilities/windows-admin');

const config = require('../models/config');
const TestTask = require('../tasks/test');


module.exports = TestCommand.extend({
  availableOptions: [
    { name: 'watch', type: Boolean, default: true, aliases: ['w'] },
    { name: 'browsers', type: String },
    { name: 'colors', type: Boolean },
    { name: 'log-level', type: String },
    { name: 'port', type: Number },
    { name: 'reporters', type: String },
    { name: 'build', type: Boolean, default: true }
  ],

  run: function (commandOptions) {
    this.project.ngConfig = this.project.ngConfig || config.CliConfig.fromProject();

    var testTask = new TestTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    if (commandOptions.watch) {
      return win.checkWindowsElevation(this.ui)
        .then(
          () => {
          },
          () => {
            /* handle build error to allow watch mode to start */
          })
        .then(() => {
          return Promise.all([testTask.run(commandOptions)]);
        });
    } else {
      // if not watching ensure karma is doing a single run
      commandOptions.singleRun = true;
      return win.checkWindowsElevation(this.ui)
        .then(() => {
          return testTask.run(commandOptions);
        });
    }
  }
});

module.exports.overrideCore = true;
