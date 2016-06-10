const Task = require('../ember-cli/lib/models/task');
import * as chalk from 'chalk';
import {exec} from 'child_process';


export const E2eTask = Task.extend({
  run: function (options: any) {
    const ui = this.ui;
    let exitCode = 0;

    let protractorConfig = (options.config) ?
      this.project.ngConfig.config.e2e.protractor[options.config] :
      this.project.ngConfig.config.e2e.protractor.config;

    return new Promise((resolve) => {
      exec(`npm run e2e -- ${protractorConfig}`,
        (err: NodeJS.ErrnoException, stdout: string, stderr: string) => {
          ui.writeLine(stdout);
          if (err) {
            ui.writeLine(stderr);
            ui.writeLine(chalk.red('Some end-to-end tests failed, see above.'));
            exitCode = 1;
          } else {
            ui.writeLine(chalk.green('All end-to-end tests pass.'));
          }
          resolve(exitCode);
        });
    });
  }
});
