const Task = require('../ember-cli/lib/models/task');
import * as chalk from 'chalk';
import {exec} from 'child_process';


export default Task.extend({
  run: function() {
    const ui = this.ui;

    return new Promise(function(resolve, reject) {
      ui.writeLine(chalk.green('Installing packages for tooling via npm.'));
      exec('npm install',
        (err: NodeJS.ErrnoException, stdout: string, stderr: string) => {
        if (err) {
          ui.writeLine(stderr);
          ui.writeLine(chalk.red('Package install failed, see above.'));
          reject();
        } else {
          ui.writeLine(chalk.green('Installed packages for tooling via npm.'));
          resolve();
        }
      });
    });
  }
});
