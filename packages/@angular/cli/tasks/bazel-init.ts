const Task = require('../ember-cli/lib/models/task');
import * as chalk from 'chalk';
import { exec } from 'child_process';


export default Task.extend({
  run: function () {
    const ui = this.ui;
    ui.writeLine(chalk.green(`Initializing Bazel workspace.`));
    return new Promise((resolve, reject) => {
      exec(`bazel build :init`,
        (err: NodeJS.ErrnoException, _stdout: string, stderr: string) => {
          if (err) {
            ui.writeLine(stderr);
            const message = 'Bazel initializaiton failed, see above.';
            ui.writeLine(chalk.red(message));
            reject(message);
          } else {
            ui.writeLine(chalk.green(`Initialized Bazel workspace.`));
            resolve();
          }
        });
    });
  }
});
