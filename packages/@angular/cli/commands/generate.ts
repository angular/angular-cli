import { CommandScope, Option } from '../models/command';
import { getDefaultSchematicCollection } from '../utilities/config';
import {
  getCollection,
  getEngineHost
} from '../utilities/schematics';
import { tags, terminal } from '@angular-devkit/core';
import { SchematicCommand } from '../models/schematic-command';


export default class GenerateCommand extends SchematicCommand {
  public readonly name = 'generate';
  public readonly description = 'Generates and/or modifies files based on a schematic.';
  public static aliases = ['g'];
  public readonly scope = CommandScope.inProject;
  public arguments = ['schematic'];
  public options: Option[] = [
    ...this.coreOptions
  ];

  private initialized = false;
  public async initialize(options: any) {
    if (this.initialized) {
      return;
    }
    super.initialize(options);
    this.initialized = true;

    const [collectionName, schematicName] = this.parseSchematicInfo(options);

    if (!!schematicName) {
      const schematicOptions = await this.getOptions({
        schematicName,
        collectionName,
      });
      this.options = this.options.concat(schematicOptions.options);
      this.arguments = this.arguments.concat(schematicOptions.arguments.map(a => a.name));
    }
  }

  validate(options: any): boolean | Promise<boolean> {
    if (!options._[0]) {
      this.logger.error(tags.oneLine`
        The "ng generate" command requires a
        schematic name to be specified.
        For more details, use "ng help".`);

      return false;
    }

    return true;
  }

  public run(options: any) {
    const [collectionName, schematicName] = this.parseSchematicInfo(options);

    // remove the schematic name from the options
    options._ = options._.slice(1);

    return this.runSchematic({
      collectionName,
      schematicName,
      schematicOptions: options,
      debug: options.debug,
      dryRun: options.dryRun,
      force: options.force,
    });
  }

  private parseSchematicInfo(options: any) {
    let collectionName = getDefaultSchematicCollection();

    let schematicName: string = options._[0];

    if (schematicName) {
      if (schematicName.includes(':')) {
        [collectionName, schematicName] = schematicName.split(':', 2);
      }
    }

    return [collectionName, schematicName];
  }

  public printHelp(options: any) {
    const schematicName = options._[0];
    if (schematicName) {
      const argDisplay = this.arguments && this.arguments.length > 0
        ? ' ' + this.arguments.filter(a => a !== 'schematic').map(a => `<${a}>`).join(' ')
        : '';
      const optionsDisplay = this.options && this.options.length > 0
        ? ' [options]'
        : '';
      this.logger.info(`usage: ng generate ${schematicName}${argDisplay}${optionsDisplay}`);
      this.printHelpOptions(options);
    } else {
      this.printHelpUsage(this.name, this.arguments, this.options);
      const engineHost = getEngineHost();
      const [collectionName] = this.parseSchematicInfo(options);
      const collection = getCollection(collectionName);
      const schematicNames: string[] = engineHost.listSchematics(collection);
      this.logger.info('Available schematics:');
      schematicNames.forEach(schematicName => {
        this.logger.info(`    ${schematicName}`);
      });

      this.logger.warn(`\nTo see help for a schematic run:`);
      this.logger.info(terminal.cyan(`  ng generate <schematic> --help`));
    }
  }
}
