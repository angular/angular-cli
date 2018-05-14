import { tags, terminal } from '@angular-devkit/core';
import { NodePackageDoesNotSupportSchematics } from '@angular-devkit/schematics/tools';
import { CommandScope, Option } from '../models/command';
import { parseOptions } from '../models/command-runner';
import { SchematicCommand } from '../models/schematic-command';
import { NpmInstall } from '../tasks/npm-install';
import { getPackageManager } from '../utilities/config';


export default class AddCommand extends SchematicCommand {
  readonly name = 'add';
  readonly description = 'Add support for a library to your project.';
  readonly allowPrivateSchematics = true;
  scope = CommandScope.inProject;
  arguments = ['collection'];
  options: Option[] = [];

  private async _parseSchematicOptions(collectionName: string): Promise<any> {
    const schematicOptions = await this.getOptions({
      schematicName: 'ng-add',
      collectionName,
    });

    const options = this.options.concat(schematicOptions.options);
    const args = schematicOptions.arguments.map(arg => arg.name);

    return parseOptions(this._rawArgs, options, args, this.argStrategy);
  }

  validate(options: any) {
    const collectionName = options._[0];

    if (!collectionName) {
      this.logger.fatal(
        `The "ng ${this.name}" command requires a name argument to be specified eg. `
        + `${terminal.yellow('ng add [name] ')}. For more details, use "ng help".`,
      );

      return false;
    }

    return true;
  }

  async run(options: any) {
    const firstArg = options._[0];

    if (!firstArg) {
      this.logger.fatal(
        `The "ng ${this.name}" command requires a name argument to be specified eg. `
        + `${terminal.yellow('ng add [name] ')}. For more details, use "ng help".`,
      );

      return 1;
    }

    const packageManager = getPackageManager();

    const npmInstall: NpmInstall = require('../tasks/npm-install').default;

    const packageName = firstArg.startsWith('@')
      ? firstArg.split('/', 2).join('/')
      : firstArg.split('/', 1)[0];

    // Remove the tag/version from the package name.
    const collectionName = (
      packageName.startsWith('@')
        ? packageName.split('@', 2).join('@')
        : packageName.split('@', 1).join('@')
    ) + firstArg.slice(packageName.length);

    // We don't actually add the package to package.json, that would be the work of the package
    // itself.
    await npmInstall(
      packageName,
      this.logger,
      packageManager,
      this.project.root,
    );

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

    try {
      return await this.runSchematic(runOptions);
    } catch (e) {
      if (e instanceof NodePackageDoesNotSupportSchematics) {
        this.logger.error(tags.oneLine`
          The package that you are trying to add does not support schematics. You can try using
          a different version of the package or contact the package author to add ng-add support.
        `);

        return 1;
      }

      throw e;
    }
  }
}
