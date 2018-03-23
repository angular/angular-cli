import chalk from 'chalk';
import { CommandScope, Option } from '../models/command';
import { parseOptions } from '../models/command-runner';
import { getPackageManager } from '../utilities/config';
import { SchematicCommand } from '../models/schematic-command';
import { NpmInstall } from '../tasks/npm-install';

const SilentError = require('silent-error');


export default class AddCommand extends SchematicCommand {
  readonly name = 'add';
  readonly description = 'Add support for a library to your project.';
  scope = CommandScope.inProject;
  arguments = ['collection'];
  options: Option[] = [];

  private async _parseSchematicOptions(collectionName: string): Promise<any> {
    const availableOptions: Option[] = await this.getOptions({
      schematicName: 'ng-add',
      collectionName,
    });

    const options = this.options.concat(availableOptions || []);

    return parseOptions(this._rawArgs, options, [], this.argStrategy);
  }

  validate(options: any) {
    const collectionName = options._[0];

    if (!collectionName) {
      throw new SilentError(
        `The "ng ${this.name}" command requires a name argument to be specified eg. `
        + `${chalk.yellow('ng add [name] ')}. For more details, use "ng help".`
      );
    }

    return true;
  }

  async run(options: any) {
    const collectionName = options._[0];

    if (!collectionName) {
      throw new SilentError(
        `The "ng ${this.name}" command requires a name argument to be specified eg. `
        + `${chalk.yellow('ng add [name] ')}. For more details, use "ng help".`
      );
    }

    const packageManager = getPackageManager();

    const npmInstall: NpmInstall = require('../tasks/npm-install').default;

    const packageName = collectionName.startsWith('@')
      ? collectionName.split('/', 2).join('/')
      : collectionName.split('/', 1)[0];

    // We don't actually add the package to package.json, that would be the work of the package
    // itself.
    await npmInstall(
      packageName,
      this.logger,
      packageManager,
      this.project.root,
      false);

    // Reparse the options with the new schematic accessible.
    options = await this._parseSchematicOptions(collectionName);

    const runOptions = {
      schematicOptions: options,
      workingDir: this.project.root,
      collectionName,
      schematicName: 'ng-add',
      allowPrivate: true,
      dryRun: false,
      force: false,
    };

    await this.runSchematic(runOptions);
  }
}
