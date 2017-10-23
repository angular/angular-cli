const Task = require('../ember-cli/lib/models/task');
import chalk from 'chalk';
import { spawn } from 'child_process';


export default Task.extend({
  run: function () {
    const ui = this.ui;
    let packageManager = this.packageManager;
    if (packageManager === 'default') {
      packageManager = 'npm';
    }

    ui.writeLine(chalk.green(`Installing packages for tooling via ${packageManager}.`));

    const installArgs = ['install'];
    if (packageManager === 'npm') {
      installArgs.push('--quiet');
    }
    const installOptions = {
      stdio: 'inherit',
      shell: true
    };

    return new Promise((resolve, reject) => {
      spawn(packageManager, installArgs, installOptions)
        .on('close', (code: number) => {
          if (code === 0) {
            ui.writeLine(chalk.green(`Installed packages for tooling via ${packageManager}.`));
            resolve();
          } else {
            const message = 'Package install failed, see above.';
            ui.writeLine(chalk.red(message));
            reject(message);
          }
      });
    });
  }
});
