const Task = require('../ember-cli/lib/models/task');
import * as chalk from 'chalk';
import * as path from 'path';
import { requireDependency } from '../utilities/require-project-module';
import { CliConfig } from '../models/config';
import { LintCommandOptions } from '../commands/lint';
import { oneLine } from 'common-tags';

export default Task.extend({
  run: function (commandOptions: LintCommandOptions) {
    const ui = this.ui;
    const projectRoot = this.project.root;

    return new Promise(function (resolve, reject) {
      const tslint = requireDependency(projectRoot, 'tslint');
      const Linter = tslint.Linter;
      const Configuration = tslint.Configuration;

      const lintConfigs = CliConfig.fromProject().config.lint || [];

      if (lintConfigs.length === 0) {
        ui.writeLine(chalk.yellow(oneLine`
          No lint config(s) found.
          If this is not intended, run "ng update".
        `));
        return resolve(0);
      }

      let errors = 0;

      lintConfigs.forEach((config) => {
        const program = Linter.createProgram(config.project);
        const files: string[] = Linter.getFileNames(program);

        const linter = new Linter({
          fix: commandOptions.fix,
          formatter: commandOptions.format
        }, program);

        files.forEach((file) => {
          const fileContents = program.getSourceFile(file).getFullText();
          const configLoad = Configuration.findConfiguration(config.tslintConfig, file);
          linter.lint(file, fileContents, configLoad.results);
        });

        const result = linter.getResult();
        errors += result.failureCount;

        ui.writeLine(result.output.trim().concat('\n'));
      });

      if (errors > 0) {
        ui.writeLine(chalk.red('Lint errors found in the listed files.'));
        return commandOptions.force ? resolve(0) : resolve(2);
      }

      ui.writeLine(chalk.green('All files pass linting.'));
      return resolve(0);
    });
  }
});
