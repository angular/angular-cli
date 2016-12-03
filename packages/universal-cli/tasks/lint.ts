const Task = require('../ember-cli/lib/models/task');
import * as chalk from 'chalk';
import {exec} from 'child_process';

export default Task.extend({
  run: function () {
    const ui = this.ui;

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
