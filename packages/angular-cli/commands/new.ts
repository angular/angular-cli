import * as chalk from 'chalk';
import InitCommand from './init';
import { oneLine, stripIndent } from 'common-tags';
import { availableOptions } from './new.options';

const Command = require('../ember-cli/lib/models/command');
const Project = require('../ember-cli/lib/models/project');
const SilentError = require('silent-error');
const validProjectName = require('../ember-cli/lib/utilities/valid-project-name');

const packageNameRegexp = /^[a-zA-Z][.0-9a-zA-Z]*(-[a-zA-Z][.0-9a-zA-Z]*)*$/;

function getRegExpFailPosition(str: string) {
  const parts = str.split('-');
  const matched: string[] = [];

  parts.forEach(part => {
    if (part.match(packageNameRegexp)) {
      matched.push(part);
    }
  });

  const compare = matched.join('-');
  return (str !== compare) ? compare.length : null;
}

const NewCommand = Command.extend({
  name: 'new',
  description: `Creates a new directory and runs ${chalk.green('ng init')} in it.`,
  works: 'outsideProject',

  availableOptions: availableOptions,

  run: function (commandOptions: any, rawArgs: string[]) {
    const packageName = rawArgs.shift();

    if (!packageName) {
      return Promise.reject(new SilentError(
        `The "ng ${this.name}" command requires a name argument to be specified. ` +
        `For more details, use "ng help".`));
    }
    if (!packageName.match(packageNameRegexp)) {
      const firstMessage = oneLine`
        Project name "${packageName}" is not valid. New project names must
        start with a letter, and must contain only alphanumeric characters or dashes.
        When adding a dash the segment after the dash must start with a letter too.
      `;
      const msg = stripIndent`
        ${firstMessage}
        ${packageName}
        ${Array(getRegExpFailPosition(packageName) + 1).join(' ') + '^'}
      `;
      return Promise.reject(new SilentError(msg));
    }

    commandOptions.name = packageName;
    if (commandOptions.dryRun) {
      commandOptions.skipGit = true;
    }

    if (packageName === '.') {
      return Promise.reject(new SilentError(
        `Trying to generate an application structure in this directory? Use "ng init" ` +
        `instead.`));
    }

    if (!validProjectName(packageName)) {
      return Promise.reject(
        new SilentError(`We currently do not support a name of "${packageName}".`));
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
