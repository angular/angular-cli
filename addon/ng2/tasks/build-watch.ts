import * as chalk from 'chalk';
import * as Task from 'ember-cli/lib/models/task';
import * as Watcher from 'ember-cli/lib/models/watcher';
import * as Builder from './builder';
import * as Promise from 'ember-cli/lib/ext/promise';

module.exports = Task.extend({
  run: function(options) {
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
      return new Promise(function () {}); 
    });
  }
});
