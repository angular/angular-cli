const Task = require('../ember-cli/lib/models/task');
import * as chalk from 'chalk';
import {exec} from 'child_process';

export default Task.extend({
  run: function() {
    const ui = this.ui;

    let packageManager = this.packageManager;
    if (packageManager === 'default') {
      packageManager = 'npm';
    }

    return new Promise(function(resolve, reject) {
      exec(`${packageManager} link @angular/cli`, (err) => {
        if (err) {
          ui.writeLine(chalk.red(`Couldn't do '${packageManager} link @angular/cli'.`));
          reject();
        } else {
          ui.writeLine(chalk.green('Successfully linked to @angular/cli.'));
          resolve();
        }
      });
    });
  }
});
