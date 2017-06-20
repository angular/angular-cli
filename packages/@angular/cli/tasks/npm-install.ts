const Task = require('../ember-cli/lib/models/task');
import * as chalk from 'chalk';
import {exec} from 'child_process';
import {checkYarnOrCNPM} from '../utilities/check-package-manager';


export default Task.extend({
  run: function() {
    const ui = this.ui;
    let packageManager = this.packageManager;
    if (packageManager === 'default') {
      packageManager = 'npm';
    }

    return checkYarnOrCNPM().then(function () {
      ui.writeLine(chalk.green(`Installing packages for tooling via ${packageManager}.`));
      let installCommand = `${packageManager} install`;
      if (packageManager === 'npm') {
        installCommand = `${packageManager} --quiet install`;
      }
      exec(installCommand,
        (err: NodeJS.ErrnoException, _stdout: string, stderr: string) => {
        if (err) {
          ui.writeLine(stderr);
          const message = 'Package install failed, see above.';
          ui.writeLine(chalk.red(message));
          throw new Error(message);
        } else {
          ui.writeLine(chalk.green(`Installed packages for tooling via ${packageManager}.`));
        }
      });
    });
  }
});
