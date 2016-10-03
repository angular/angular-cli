const Task = require('ember-cli/lib/models/task');
import * as Promise from 'ember-cli/lib/ext/promise';
import * as chalk from 'chalk';
import {exec} from 'child_process';

export const DepsTask: any = Task.extend({
  run: function () {
    const ui = this.ui;

    return new Promise(function(resolve, reject) {
      exec('npm run deps', (err, stdout) => {
        ui.writeLine(stdout);
        if (err) {
          ui.writeLine(chalk.red('Can not generate the graph dependencies.'));
          reject();
        } else {
          ui.writeLine(chalk.green('Graph dependencies generated.'));
          resolve();
        }
      });
    });
  }
});
