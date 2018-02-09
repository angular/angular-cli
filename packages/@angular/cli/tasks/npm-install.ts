import { ModuleNotFoundException, resolve } from '@angular-devkit/core/node';

const Task = require('../ember-cli/lib/models/task');
import chalk from 'chalk';
import { spawn } from 'child_process';


export default Task.extend({
  run: async function () {
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
    if (this.packageName) {
      try {
        // Verify if we need to install the package (it might already be there).
        // If it's available and we shouldn't save, simply return. Nothing to be done.
        resolve(this.packageName, { checkLocal: true, basedir: this.project.root });

        if (!this.save) {
          return;
        }
      } catch (e) {
        if (!(e instanceof ModuleNotFoundException)) {
          throw e;
        }
      }
      installArgs.push(this.packageName);
    }

    if (!this.save) {
      installArgs.push('--no-save');
    }
    const installOptions = {
      stdio: 'inherit',
      shell: true
    };

    await new Promise((resolve, reject) => {
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
