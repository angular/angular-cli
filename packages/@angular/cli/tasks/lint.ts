const Task = require('../ember-cli/lib/models/task');
import * as chalk from 'chalk';
import * as glob from 'glob';
import * as ts from 'typescript';
import { requireProjectModule } from '../utilities/require-project-module';
import { CliConfig } from '../models/config';
import { LintCommandOptions } from '../commands/lint';

interface CliLintConfig {
  files?: (string | string[]);
  project?: string;
  tslintConfig?: string;
  exclude?: (string | string[]);
}

export default Task.extend({
  run: function (commandOptions: LintCommandOptions) {
    const ui = this.ui;
    const projectRoot = this.project.root;
    const lintConfigs: CliLintConfig[] = CliConfig.fromProject().config.lint || [];

    if (lintConfigs.length === 0) {
      ui.writeLine(chalk.yellow('No lint configuration(s) found.'));
      return Promise.resolve(0);
    }

    const tslint = requireProjectModule(projectRoot, 'tslint');
    const Linter = tslint.Linter;
    const Configuration = tslint.Configuration;

    const result = lintConfigs
      .map((config) => {
        const program: ts.Program = Linter.createProgram(config.project);
        const files = getFilesToLint(program, config, Linter);
        const lintOptions = {
          fix: commandOptions.fix,
          formatter: commandOptions.format
        };
        const lintProgram = commandOptions.typeCheck ? program : undefined;
        const linter = new Linter(lintOptions, lintProgram);

        files.forEach((file) => {
          const sourceFile = program.getSourceFile(file);
          if (!sourceFile) {
            return;
          }
          const fileContents = sourceFile.getFullText();
          const configLoad = Configuration.findConfiguration(config.tslintConfig, file);
          linter.lint(file, fileContents, configLoad.results);
        });

        return linter.getResult();
      })
      .reduce((total, current) => {
        const failures = current.failures
          .filter((cf: any) => !total.failures.some((ef: any) => ef.equals(cf)));
        total.failures = total.failures.concat(...failures);

        if (current.fixes) {
          total.fixes = (total.fixes || []).concat(...current.fixes);
        }
        return total;
      }, {
        failures: [],
        fixes: undefined
      });

    const Formatter = tslint.findFormatter(commandOptions.format);
    const formatter = new Formatter();

    const output = formatter.format(result.failures, result.fixes);
    if (output) {
      ui.writeLine(output);
    }

    // print formatter output directly for non human-readable formats
    if (['prose', 'verbose', 'stylish'].indexOf(commandOptions.format) == -1) {
      return (result.failures.length == 0 || commandOptions.force)
        ? Promise.resolve(0) : Promise.resolve(2);
    }

    if (result.failures.length > 0) {
      ui.writeLine(chalk.red('Lint errors found in the listed files.'));
      return commandOptions.force ? Promise.resolve(0) : Promise.resolve(2);
    }

    ui.writeLine(chalk.green('All files pass linting.'));
    return Promise.resolve(0);
  }
});

function getFilesToLint(program: ts.Program, lintConfig: CliLintConfig, Linter: any): string[] {
  let files: string[] = [];

  if (lintConfig.files !== null) {
    files = Array.isArray(lintConfig.files) ? lintConfig.files : [lintConfig.files];
  } else {
    files = Linter.getFileNames(program);
  }

  let globOptions = {};

  if (lintConfig.exclude !== null) {
    const excludePatterns = Array.isArray(lintConfig.exclude)
      ? lintConfig.exclude
      : [lintConfig.exclude];

    globOptions = { ignore: excludePatterns, nodir: true };
  }

  files = files
    .map((file: string) => glob.sync(file, globOptions))
    .reduce((a: string[], b: string[]) => a.concat(b), []);

  return files;
}
