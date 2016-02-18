'use strict';

var chalk        = require('chalk');
var Command      = require('ember-cli/lib/models/command');
var Promise      = require('ember-cli/lib/ext/promise');
var Project      = require('ember-cli/lib/models/project');
var SilentError        = require('silent-error');
var validProjectName   = require('ember-cli/lib/utilities/valid-project-name');
var normalizeBlueprint = require('ember-cli/lib/utilities/normalize-blueprint-option');

var TestCommand = require('ember-cli/lib/commands/test');
var TestTask = require('../tasks/test');
var win = require('ember-cli/lib/utilities/windows-admin');
var path = require('path');


module.exports = TestCommand.extend({
  availableOptions: [
    { name: 'single-run', type: Boolean, default: true },
    { name: 'auto-watch', type: Boolean },
    { name: 'browsers', type: String },
    { name: 'colors', type: Boolean },
    { name: 'log-level', type: String },
    { name: 'port', type: Number },
    { name: 'reporters', type: String },
  ],

  run: function(commandOptions, rawArgs) {
    var BuildTask = this.tasks.Build;
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

    var buildCommandOptions = {
      environment: 'development',
      outputPath: 'dist/',
      watch: false
    };

    var projectRoot = this.project.root;

    return win.checkWindowsElevation(this.ui)
      .then(function() {
        return buildTask.run(buildCommandOptions);
      })
      .then(function(){
        return testTask.run(commandOptions);
      });
  }
});

module.exports.overrideCore = true;