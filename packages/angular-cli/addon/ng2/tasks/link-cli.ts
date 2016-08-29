const Task = require('ember-cli/lib/models/task');
import * as chalk from 'chalk';
import {spawn} from 'child_process';

export default Task.extend({
  run: function() {
    const ui = this.ui;

    return new Promise(function(resolve, reject) {
      const childProcess = spawn('npm', ['link', 'angular-cli']);

      childProcess.on('close', (code) => {
        if (code != 0) {
          reject(new Error('Couldn\'t do \'npm link angular-cli\'.'));
        } else {
          ui.writeLine(chalk.green('Successfully linked to angular-cli.'));
          resolve();
        }
      });
    });
  }
});
