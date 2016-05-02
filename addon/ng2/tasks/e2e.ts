import * as Promise from 'ember-cli/lib/ext/promise';
import * as Task from 'ember-cli/lib/models/task';
import * as chalk from 'chalk';
import {exec} from 'child_process';

module.exports = Task.extend({
  run: function () {
    var ui = this.ui;

    return new Promise((resolve) => {
      exec(`npm run e2e -- ${this.project.ngConfig.e2e.protractor.config}`, (err, stdout) => {
        ui.writeLine(stdout);
        if (err) {
          ui.writeLine(chalk.red('Some end-to-end tests failed, see above.'));
        } else {
          ui.writeLine(chalk.green('All end-to-end tests pass.'));
        }
        resolve();
      });
    });
  }
});
