import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { checkYarnOrCNPM } from '../utilities/check-package-manager';
import { validateProjectName } from '../utilities/validate-project-name';
import { CliConfig } from '../models/config';

const Task = require('../ember-cli/lib/models/task');
const SilentError = require('silent-error');


export default Task.extend({

  run: function (commandOptions: any, _rawArgs: string[]) {
    if (commandOptions.dryRun) {
      commandOptions.skipInstall = true;
      commandOptions.skipGit = true;
    }

    const project = this.project;
    const packageName = commandOptions.name !== '.' && commandOptions.name || project.name();

    if (commandOptions.style === undefined) {
      commandOptions.style = CliConfig.fromGlobal().get('defaults.styleExt');
    }

    if (!packageName) {
      const message = 'The `ng ' + this.name + '` command requires a ' +
        'package.json in current folder with name attribute or a specified name via arguments. ' +
        'For more details, use `ng help`.';

      return Promise.reject(new SilentError(message));
    }

    validateProjectName(packageName);

    const SchematicRunTask = require('../tasks/schematic-run').default;
    const schematicRunTask = new SchematicRunTask({
      ui: this.ui,
      project: this.project
    });

    const cwd = this.project.root;
    const schematicName = CliConfig.fromGlobal().get('defaults.schematics.newApp');

    if (commandOptions.version) {
      this.ui.writeLine(chalk.yellow(
        '*** The "--version" option is intended for internal development purposes only.'
        + '  Use at your own risk. ***'));
    } else {
      const packageJson = require('../package.json');
      commandOptions.version = packageJson.version;
    }

    if (!commandOptions.skipGit) {
      const commitMessage = fs.readFileSync(
        path.join(__dirname, '../utilities/INITIAL_COMMIT_MESSAGE.txt'),
        'utf-8',
      );
      commandOptions.commit = {
        message: commitMessage,
        name: process.env.GIT_AUTHOR_NAME || 'Angular CLI',
        email: process.env.GIT_AUTHOR_EMAIL || 'angular-cli@angular.io',
      };
    }

    const runOptions = {
      taskOptions: commandOptions,
      workingDir: cwd,
      emptyHost: true,
      collectionName: commandOptions.collectionName,
      schematicName
    };

    return schematicRunTask.run(runOptions)
      .then(() => {
        if (!commandOptions.skipInstall) {
          return checkYarnOrCNPM();
        }
      })
      .then(() => {
        if (!commandOptions.dryRun) {
          process.chdir(commandOptions.directory);
          this.ui.writeLine(chalk.green(`Project '${packageName}' successfully created.`));
        }
      });
  }
});
