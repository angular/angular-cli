'use strict';

var chalk        = require('chalk');
var Command      = require('ember-cli/lib/models/command');
var Promise      = require('ember-cli/lib/ext/promise');
var Project      = require('ember-cli/lib/models/project');
var SilentError        = require('silent-error');
var validProjectName   = require('ember-cli/lib/utilities/valid-project-name');
var normalizeBlueprint = require('ember-cli/lib/utilities/normalize-blueprint-option');

var TestCommand = require('ember-cli/lib/commands/test');
var win = require('ember-cli/lib/utilities/windows-admin');
var path = require('path');

var BuildTask = require('ember-cli/lib/tasks/build');
var BuildWatchTask = require('ember-cli/lib/tasks/build-watch');
var TestTask = require('../tasks/test');


module.exports = TestCommand.extend({
  availableOptions: [
    { name: 'watch', type: Boolean, default: true, aliases: ['w'] },
    { name: 'browsers', type: String },
    { name: 'colors', type: Boolean },
    { name: 'log-level', type: String },
    { name: 'port', type: Number },
    { name: 'reporters', type: String },
  ],

  run: function(commandOptions, rawArgs) {
    var buildWatchTask = new BuildWatchTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });
    var buildTask = new BuildTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });
    var testTask = new TestTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    var buildOptions = {
      environment: 'development',
      outputPath: 'dist/'
    };
     
    if (commandOptions.watch){
      return win.checkWindowsElevation(this.ui)
        .then(function() {
          return Promise.all([
            buildWatchTask.run(buildOptions),
            testTask.run(commandOptions)
          ]);
        });
    } else {
      // if not watching ensure karma is doing a single run
      commandOptions.singleRun = true;
      return win.checkWindowsElevation(this.ui)
        .then(function() {
          return buildTask.run(buildOptions);
        })
        .then(function(){
          return testTask.run(commandOptions);
        });
    }

  }
});

module.exports.overrideCore = true;