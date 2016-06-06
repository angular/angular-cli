import * as Promise from 'ember-cli/lib/ext/promise';
import * as Task from 'ember-cli/lib/models/task';
import * as chalk from 'chalk';
import {exec} from 'child_process';

module.exports = Task.extend({
  run: function () {
    var ui = this.ui;
    var exitCode = 0;

    return new Promise((resolve) => {
      exec(`npm run e2e -- ${this.project.ngConfig.e2e.protractor.config}`, (err, stdout, stderr) => {
        ui.writeLine(stdout);
        if (err) {
          ui.writeLine(stderr);
          ui.writeLine(chalk.red('Some end-to-end tests failed, see above.'));
          exitCode = err.code;
        } else {
          ui.writeLine(chalk.green('All end-to-end tests pass.'));
        }
        resolve(exitCode);
      });
    });
  }
});
