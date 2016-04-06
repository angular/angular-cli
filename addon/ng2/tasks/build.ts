import * as chalk from 'chalk';
import * as Task from 'ember-cli/lib/models/task';
import * as Builder from './builder';

module.exports = Task.extend({
  run: function(options) {
    const ui        = this.ui;
    const analytics = this.analytics;

    ui.startProgress(chalk.green('Building'), chalk.green('.'));

    const builder = new Builder({
      ui: ui,
      outputPath: options.outputPath,
      environment: options.environment,
      project: this.project
    });

    let totalTime;

    return builder.build()
      .then(function(results) {
        totalTime = parseInt(results.totalTime / 1e6, 10);

        analytics.track({
          name:    'angular build',
          message: totalTime + 'ms'
        });

        analytics.trackTiming({
          category: 'rebuild',
          variable: 'build time',
          label:    'broccoli build time',
          value:    totalTime
        });
      })
      .finally(function() {
        ui.stopProgress();
        return builder.cleanup();
      })
      .then(function() {
        ui.writeLine(chalk.green(`Built Angular2 project successfully in ${totalTime}ms. Stored in "` +
          options.outputPath + '".'));
      })
      .catch(function(err) {
        ui.writeLine(chalk.red('Build failed.'));

        throw err;
      });
  }
});
