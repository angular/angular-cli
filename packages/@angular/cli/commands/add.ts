import chalk from 'chalk';
import { Command, CommandScope, Option } from '../models/command';
import { parseOptions } from '../models/command-runner';
import { CliConfig } from '../models/config';
import { SchematicAvailableOptions } from '../tasks/schematic-get-options';

const SilentError = require('silent-error');


export default class AddCommand extends Command {
  readonly name = 'add';
  readonly description = 'Add support for a library to your project.';
  scope = CommandScope.inProject;
  arguments = ['collection'];
  options: Option[] = [];

  private async _parseSchematicOptions(collectionName: string): Promise<any> {
    const SchematicGetOptionsTask = require('../tasks/schematic-get-options').default;

    const getOptionsTask = new SchematicGetOptionsTask({
      ui: this.ui,
      project: this.project
    });

    const availableOptions: SchematicAvailableOptions[] = await getOptionsTask.run({
      schematicName: 'ng-add',
      collectionName,
    });

    const options = this.options.concat(availableOptions || []);

    return parseOptions(this._rawArgs, options, []);
  }

  validate(options: any) {
    const collectionName = options.collection;

    if (!collectionName) {
      throw new SilentError(
        `The "ng ${this.name}" command requires a name argument to be specified eg. `
        + `${chalk.yellow('ng add [name] ')}. For more details, use "ng help".`
      );
    }

    return true;
  }

  async run(commandOptions: any) {
    const collectionName = commandOptions.collection;

    if (!collectionName) {
      throw new SilentError(
        `The "ng ${this.name}" command requires a name argument to be specified eg. `
        + `${chalk.yellow('ng add [name] ')}. For more details, use "ng help".`
      );
    }

    const packageManager = CliConfig.fromGlobal().get('packageManager');

    const NpmInstall = require('../tasks/npm-install').default;
    const SchematicRunTask = require('../tasks/schematic-run').default;

    const packageName = collectionName.startsWith('@')
      ? collectionName.split('/', 2).join('/')
      : collectionName.split('/', 1)[0];

    // We don't actually add the package to package.json, that would be the work of the package
    // itself.
    let npmInstall = new NpmInstall({
      ui: this.ui,
      project: this.project,
      packageManager,
      packageName,
      save: false,
    });

    const schematicRunTask = new SchematicRunTask({
      ui: this.ui,
      project: this.project
    });

    await npmInstall.run();

    // Reparse the options with the new schematic accessible.
    commandOptions = await this._parseSchematicOptions(collectionName);

    const runOptions = {
      taskOptions: commandOptions,
      workingDir: this.project.root,
      collectionName,
      schematicName: 'ng-add',
      allowPrivate: true,
    };

    await schematicRunTask.run(runOptions);
  }
}
