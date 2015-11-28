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

// require dependencies within the target project
function requireDependency (root, moduleName) {
  var packageJson = require(path.join(root, 'node_modules', moduleName, 'package.json'));
  var main = path.normalize(packageJson.main);
  return require(path.join(root, 'node_modules', moduleName, main));
}

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
        return new Promise(function(resolve, reject){
          var karma = requireDependency(projectRoot, 'karma');
          var karmaConfig = path.join(projectRoot, 'karma.conf');

          // Convert browsers from a string to an array
          if (commandOptions.browsers){
            commandOptions.browsers = commandOptions.browsers.split(',');
          }
          commandOptions.configFile = karmaConfig;
          var karmaServer = new karma.Server(commandOptions, resolve);

          karmaServer.start();
        });
      });
  }
});

module.exports.overrideCore = true;