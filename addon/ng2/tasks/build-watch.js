'use strict';

var chalk    = require('chalk');
var Task     = require('ember-cli/lib/models/task');
var Watcher  = require('ember-cli/lib/models/watcher');
var Builder  = require('ember-cli/lib/models/builder');
var Promise  = require('ember-cli/lib/ext/promise');

module.exports = Task.extend({
  run: function(options) {
    this.ui.startProgress(
      chalk.green('Building'), chalk.green('.')
    );
    
    var watcher = new Watcher({
      ui: this.ui,
      builder: new Builder({
        ui: this.ui,
        outputPath: options.outputPath,
        environment: options.environment,
        project: this.project
      }),
      analytics: this.analytics,
      options: options
    });
    
    // return the watcher to enable hooking into the build events
    // return the completion promise to know when this task has ended
    
    return {
      watcher: watcher,
      completion: watcher.then(function() {
        // This has been pulled in from the ember-cli build-watch implementation
        // https://github.com/ember-cli/ember-cli/blob/3ea0ede89adaf1ac2a8b83036e84e792d367e727/lib/tasks/build-watch.js#L15-L27
        return new Promise(function () {}); // Run until failure or signal to exit
      })
    };
  }
});
