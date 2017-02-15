import * as chalk from 'chalk';
import InitCommand from './init';
import { validateProjectName } from '../utilities/validate-project-name';
import { availableOptions } from './new.options';

const Command = require('../ember-cli/lib/models/command');
const Project = require('../ember-cli/lib/models/project');
const SilentError = require('silent-error');

const NewCommand = Command.extend({
  name: 'new',
  description: `Creates a new directory and a new Angular app.`,
  works: 'outsideProject',

  availableOptions: availableOptions,

  run: function (commandOptions: any, rawArgs: string[]) {
    const packageName = rawArgs.shift();

    if (!packageName) {
      return Promise.reject(new SilentError(
        `The "ng ${this.name}" command requires a name argument to be specified. ` +
        `For more details, use "ng help".`));
    }

    validateProjectName(packageName);

    commandOptions.name = packageName;
    if (commandOptions.dryRun) {
      commandOptions.skipGit = true;
    }

    if (!commandOptions.directory) {
      commandOptions.directory = packageName;
    }

    const createAndStepIntoDirectory =
      new this.tasks.CreateAndStepIntoDirectory({ ui: this.ui });

    const initCommand = new InitCommand({
      ui: this.ui,
      tasks: this.tasks,
      project: Project.nullProject(this.ui, this.cli)
    });

    return createAndStepIntoDirectory
      .run({
        directoryName: commandOptions.directory,
        dryRun: commandOptions.dryRun
      })
      .then(initCommand.run.bind(initCommand, commandOptions, rawArgs));
  }
});


NewCommand.overrideCore = true;
export default NewCommand;
