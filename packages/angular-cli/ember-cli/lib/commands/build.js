'use strict';

var Command = require('../models/command');
var win     = require('../utilities/windows-admin');

module.exports = Command.extend({
  name: 'build',
  description: 'Builds your app and places it into the output path (dist/ by default).',
  aliases: ['b'],

  availableOptions: [
    { name: 'environment',    type: String,  default: 'development', aliases: ['e', { 'dev': 'development' }, { 'prod': 'production' }] },
    { name: 'output-path',    type: 'Path',  default: 'dist/',       aliases: ['o'] },
    { name: 'watch',          type: Boolean, default: false,         aliases: ['w'] },
    { name: 'watcher',        type: String },
    { name: 'suppress-sizes', type: Boolean, default: false }
  ],

  run: function(commandOptions) {
    var BuildTask = this.taskFor(commandOptions);
    var buildTask = new BuildTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });
    var ShowAssetSizesTask = this.tasks.ShowAssetSizes;
    var showTask = new ShowAssetSizesTask({
      ui: this.ui
    });

    return win.checkWindowsElevation(this.ui).then(function () {
      return buildTask.run(commandOptions)
        .then(function () {
          if (!commandOptions.suppressSizes && commandOptions.environment === 'production') {
            return showTask.run({
              outputPath: commandOptions.outputPath
            });
          }
        });
    });
  },

  taskFor: function(options) {
    if (options.watch) {
      return this.tasks.BuildWatch;
    } else {
      return this.tasks.Build;
    }
  }
});
