import { Command, CommandScope, Option } from '../models/command';
import chalk from 'chalk';
import { CliConfig } from '../models/config';
import {
  getCollection,
  getEngineHost
} from '../utilities/schematics';
import { SchematicAvailableOptions } from '../tasks/schematic-get-options';
import { oneLine } from 'common-tags';
import { getConfigValues } from '../tasks/schematic-get-config-values';

const { cyan } = chalk;

export default class GenerateCommand extends Command {
  public readonly name = 'generate';
  public readonly description = 'Generates and/or modifies files based on a schematic.';
  public static aliases = ['g'];
  public readonly scope = CommandScope.inProject;
  public arguments = ['schematic'];
  public options: Option[] = [
    {
      name: 'dry-run',
      type: Boolean,
      default: false,
      aliases: ['d'],
      description: 'Run through without making any changes.'
    },
    {
      name: 'force',
      type: Boolean,
      default: false,
      aliases: ['f'],
      description: 'Forces overwriting of files.'
    },
    {
      name: 'app',
      type: String,
      description: 'Specifies app name to use.'
    }
  ];

  private initialized = false;
  public async initialize(options: any): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }
    this.initialized = true;

    const [collectionName, schematicName] = this.parseSchematicInfo(options);

    if (!!schematicName) {
      const SchematicGetOptionsTask = require('../tasks/schematic-get-options').default;

      const getOptionsTask = new SchematicGetOptionsTask({
        ui: this.ui,
        project: this.project
      });

      const availableOptions: SchematicAvailableOptions[] = await getOptionsTask.run({
        schematicName,
        collectionName,
      });
      let anonymousOptions: string[] = [];

      if (availableOptions) {
        const nameOption = availableOptions.filter(opt => opt.name === 'name')[0];
        if (nameOption) {
          anonymousOptions = [...anonymousOptions, 'name'];
        }
      } else {
        anonymousOptions = [...anonymousOptions, 'name'];
      }

      if (collectionName === '@schematics/angular' && schematicName === 'interface') {
        anonymousOptions = [...anonymousOptions, 'type'];
      }

      this.arguments = this.arguments.concat(anonymousOptions);
      this.options = this.options.concat( availableOptions || []);
    }
  }

  validate(options: any): boolean | Promise<boolean> {
    if (!options.schematic) {
      this.logger.error(oneLine`
        The "ng generate" command requires a
        schematic name to be specified.
        For more details, use "ng help".`);

      return false;
    }
    if (options.name && /^\d/.test(options.name)) {
      this.logger.error(oneLine`The \`ng generate ${options.schematic} ${options.name}\`
        file name cannot begin with a digit.`);

      return false;
    }
    return true;
  }

  public run(options: any) {
    const cwd = process.env.PWD;
    const [collectionName, schematicName] = this.parseSchematicInfo(options);

    const workingDir = cwd.replace(this.project.root, '');
    const pathOptions = this.getPathOptions(options, workingDir);
    options = { ...options, ...pathOptions };

    options = getConfigValues(this.name, options.schematic, this.options, options);

    const SchematicRunTask = require('../tasks/schematic-run').default;
    const schematicRunTask = new SchematicRunTask({
      ui: this.ui,
      project: this.project
    });

    const schematicOptions = this.stripLocalOptions(options);
    return schematicRunTask.run({
        taskOptions: schematicOptions,
        dryRun: options.dryRun,
        force: options.force,
        workingDir: this.project.root,
        collectionName,
        schematicName
      });
  }

  protected getPathOptions(options: any, workingDir: string): any {
    return this.options
      .filter(o => o.format === 'path')
      .map(o => o.name)
      .filter(name => options[name] === undefined)
      .reduce((acc: any, curr) => acc[curr] = workingDir, {});
  }

  private parseSchematicInfo(options: any) {
    let collectionName: string = CliConfig.getValue('defaults.schematics.collection');

    let schematicName = options.schematic;

    if (schematicName) {
      if (schematicName.match(/:/)) {
        [collectionName, schematicName] = schematicName.split(':', 2);
      }
    }

    return [collectionName, schematicName];
  }

  public printHelp(options: any) {
    if (options.schematic) {
      super.printHelp(options);
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
      this.logger.info(cyan(`  ng generate <schematic> --help`));
    }
  }

  private stripLocalOptions(options: any): any {
    const opts = Object.assign({}, options);
    delete opts.dryRun;
    delete opts.force;
    delete opts.app;
    return opts;
  }
}
