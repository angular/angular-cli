'use strict';

var Promise = require('ember-cli/lib/ext/promise');
var TestCommand = require('ember-cli/lib/commands/test');
var win = require('ember-cli/lib/utilities/windows-admin');
// var BuildTask = require('ember-cli/lib/tasks/build');
// var BuildWatchTask = require('ember-cli/lib/tasks/build-watch');
const BuildWebpack = require('../tasks/build-webpack');
const BuildWebpackWatch = require('../tasks/build-webpack-watch');
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

    // var buildWatchTask =
    //   new BuildWebpackWatch({
    //     ui: this.ui,
    //     analytics: this.analytics,
    //     project: this.project
    //   });
    // var buildTask = new BuildWebpack({
    //   ui: this.ui,
    //   analytics: this.analytics,
    //   project: this.project
    // });
    var testTask = new TestTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    // var buildOptions = {
    //   environment: 'development',
    //   outputPath: 'dist/'
    // };

    // If not building, mock/suppress build tasks.
    // if (!commandOptions.build) {
    //   buildTask = {
    //     run: () => {
    //       return;
    //     }
    //   };
    //   buildWatchTask = buildTask;
    // }

    if (commandOptions.watch) {
      return win.checkWindowsElevation(this.ui)
        .then(
          () => {
            // perform initial build to avoid race condition
            // return buildTask.run(buildOptions);
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
        // .then(() => {
        //   return buildTask.run(buildOptions);
        // })
        .then(() => {
          return testTask.run(commandOptions);
        });
    }

  }
});

module.exports.overrideCore = true;
