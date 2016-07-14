const chalk    = require('chalk');
const Task     = require('ember-cli/lib/models/task');
const Watcher  = require('ember-cli/lib/models/watcher');
const Promise  = require('ember-cli/lib/ext/promise');

const Builder  = require('../models/builder');


module.exports = Task.extend({
  run: function(options) {
    console.log(2);
    this.ui.startProgress(
      chalk.green('Building'), chalk.green('.')
    );

    return new Watcher({
      ui: this.ui,
      builder: new Builder({
        ui: this.ui,
        outputPath: options.outputPath,
        environment: options.environment,
        project: this.project
      }),
      analytics: this.analytics,
      options: options
    }).then(function() {
      return new Promise(function () {}); // Run until failure or signal to exit
    });
  }
});
