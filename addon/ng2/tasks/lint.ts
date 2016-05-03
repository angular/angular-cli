import * as Promise from 'ember-cli/lib/ext/promise';
import * as Task from 'ember-cli/lib/models/task';
import * as chalk from 'chalk';
import {exec} from 'child_process';

module.exports = Task.extend({
  run: function () {
    var ui = this.ui;

    return new Promise(function(resolve, reject) {
      exec('npm run lint', (err, stdout) => {
        ui.writeLine(stdout);
        if (err) {
          ui.writeLine(chalk.red('Lint errors found in the listed files.'));
          reject();
        } else {
          ui.writeLine(chalk.green('All files pass linting.'));
          resolve();
        }
      });
    });
  }
});
