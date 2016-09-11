const Task = require('ember-cli/lib/models/task');
import * as chalk from 'chalk';
import {exec} from 'child_process';

export default Task.extend({
  run: function() {
    const ui = this.ui;

    return new Promise(function(resolve, reject) {
      exec('npm link angular-cli', (err) => {
        if (err) {
          ui.writeLine(chalk.red('Couldn\'t do \'npm link angular-cli\'.'));
          reject();
        } else {
          ui.writeLine(chalk.green('Successfully linked to angular-cli.'));
          resolve();
        }
      });
    });
  }
});
