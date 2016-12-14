const Task = require('../ember-cli/lib/models/task');
import * as chalk from 'chalk';
import { exec } from 'child_process';
import { E2eOptions } from '../commands/e2e';

export const E2eTask = Task.extend({
  run: function (options: E2eOptions) {
    const commandArgs: string[] = [];
    const ui = this.ui;
    let exitCode = 0;

    if (options.suite) {
      commandArgs.push(`--suite=${options.suite}`);
    }

    return new Promise((resolve) => {
      const protractorConfig = this.project.ngConfig.config.e2e.protractor.config;
      exec(`npm run e2e -- ${protractorConfig} ${commandArgs.join(' ')}`,
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
