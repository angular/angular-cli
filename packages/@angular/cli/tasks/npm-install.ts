const Task = require('../ember-cli/lib/models/task');
import * as chalk from 'chalk';
import { exec } from 'child_process';


export default Task.extend({
  run: function () {
    const ui = this.ui;
    let packageManager = this.packageManager;
    if (packageManager === 'default') {
      packageManager = 'npm';
    }

    ui.writeLine(chalk.green(`Installing packages for tooling via ${packageManager}.`));
    let installCommand = `${packageManager} install`;
    if (packageManager === 'npm') {
      installCommand = `${packageManager} --quiet install`;
    }

    return new Promise((resolve, reject) => {
      exec(installCommand,
        (err: NodeJS.ErrnoException, _stdout: string, stderr: string) => {
          if (err) {
            ui.writeLine(stderr);
            const message = 'Package install failed, see above.';
            ui.writeLine(chalk.red(message));
            reject(message);
          } else {
            ui.writeLine(chalk.green(`Installed packages for tooling via ${packageManager}.`));
            resolve();
          }
        });
    });
  }
});
