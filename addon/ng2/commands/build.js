'use strict';

var path    = require('path');
var Command      = require('ember-cli/lib/models/command');
var win = require('ember-cli/lib/utilities/windows-admin');
var BuildCommand = require('ember-cli/lib/commands/build');
var BuildTask = require('ember-cli/lib/tasks/build');
var BuildWatchTask = require('ember-cli/lib/tasks/build-watch');
var TestTask = require('../tasks/test');

module.exports = BuildCommand.extend({
  name: 'build',
  description: 'Builds your app and places it into the output path (dist/ by default).',
  aliases: ['b'],

  availableOptions: [
    { name: 'environment', type: String,  default: 'development', aliases: ['e', { 'dev': 'development' }, { 'prod': 'production' }] },
    { name: 'watch',       type: Boolean, default: false,         aliases: ['w'] },
    { name: 'watcher',     type: String },
    { name: 'no-test',     type: Boolean, default: false}
  ],
  
  run: function(commandOptions){
    // outputPath was removed from the avaiableOptions
    // so it must be set internally
    commandOptions.outputPath = 'dist/';
    
    var BuildTask = this.tasks.Build;
    var buildTask = new BuildTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });
    var BuildWatchTask = this.tasks.BuildWatch;
    var buildWatchTask = new BuildWatchTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });
    var testTask = new TestTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });
    
    if (!commandOptions.noTest) {
      commandOptions.buildCompleted = function(){
        return testTask.run({singleRun: true});
      };
    }
    
    var buildTaskToRun = commandOptions.watch
      ? buildWatchTask
      : buildTask;
    
    return win.checkWindowsElevation(this.ui)
      .then(function() {
        return buildTaskToRun.run(commandOptions);
      });
  }
});

module.exports.overrideCore = true;