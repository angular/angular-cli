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
      ui.writeLine(chalk.green(`Installing packages for tooling via ${packageManager}.`));
      let installCommand = `${packageManager} install`;
      if (packageManager === 'npm') {
        installCommand = `${packageManager} --quiet install`;
      }
      exec(installCommand,
        (err: NodeJS.ErrnoException, _stdout: string, stderr: string) => {
        if (err) {
          ui.writeLine(stderr);
          ui.writeLine(chalk.red('Package install failed, see above.'));
          reject();
        } else {
          ui.writeLine(chalk.green(`Installed packages for tooling via ${packageManager}.`));
          resolve();
        }
      });
    });
  }
});
