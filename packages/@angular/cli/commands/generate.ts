import { Command, CommandScope } from '../models/command';
import chalk from 'chalk';
const stringUtils = require('ember-cli-string-utils');
import { CliConfig } from '../models/config';
import {
  getCollection,
  getEngineHost
} from '../utilities/schematics';
import { DynamicPathOptions, dynamicPathParser } from '../utilities/dynamic-path-parser';
import { getAppFromConfig } from '../utilities/app-utils';
import * as path from 'path';
import { SchematicAvailableOptions } from '../tasks/schematic-get-options';
import { oneLine } from 'common-tags';

const { cyan } = chalk;
const separatorRegEx = /[\/\\]/g;

export default class GenerateCommand extends Command {
  public readonly name = 'generate';
  public readonly description = 'Generates and/or modifies files based on a schematic.';
  public static aliases = ['g'];
  public readonly scope = CommandScope.inProject;
  public arguments = ['schematic'];
  public options = [
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
      aliases: ['a'],
      description: 'Specifies app name to use.'
    },
    {
      name: 'collection',
      type: String,
      aliases: ['c'],
      description: 'Schematics collection to use.'
    },
    {
      name: 'lint-fix',
      type: Boolean,
      aliases: ['l'],
      description: 'Use lint to fix files after generation.'
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
    let entityName = options.name;

    if (entityName) {
      options.name = stringUtils.dasherize(entityName.split(separatorRegEx).pop());
    } else {
      entityName = '';
    }

    const appConfig = getAppFromConfig(options.app);
    const dynamicPathOptions: DynamicPathOptions = {
      project: this.project,
      entityName: entityName,
      appConfig: appConfig,
      dryRun: options.dryRun
    };
    const parsedPath = dynamicPathParser(dynamicPathOptions);
    options.sourceDir = parsedPath.sourceDir.replace(separatorRegEx, '/');
    const root = parsedPath.sourceDir + path.sep;
    options.appRoot = parsedPath.appRoot === parsedPath.sourceDir ? '' :
      parsedPath.appRoot.startsWith(root)
        ? parsedPath.appRoot.substr(root.length)
        : parsedPath.appRoot;

    options.path = parsedPath.dir.replace(separatorRegEx, '/');
    options.path = parsedPath.dir === parsedPath.sourceDir ? '' :
      parsedPath.dir.startsWith(root)
        ? options.path.substr(root.length)
        : options.path;

    const cwd = this.project.root;
    const [collectionName, schematicName] = this.parseSchematicInfo(options);

    if (['component', 'c', 'directive', 'd'].indexOf(schematicName) !== -1) {
      if (options.prefix === undefined) {
        options.prefix = appConfig.prefix;
      }

      if (schematicName === 'component' || schematicName === 'c') {
        if (options.styleext === undefined) {
          options.styleext = CliConfig.getValue('defaults.styleExt');
        }
      }
    }

    const SchematicRunTask = require('../tasks/schematic-run').default;
    const schematicRunTask = new SchematicRunTask({
      ui: this.ui,
      project: this.project
    });

    if (collectionName === '@schematics/angular' && schematicName === 'interface' && options.type) {
      options.type = options.type;
    }

    return schematicRunTask.run({
        taskOptions: options,
        workingDir: cwd,
        collectionName,
        schematicName
      });
  }

  private parseSchematicInfo(options: any) {
    let collectionName: string =
      options.collection ||
      options.c ||
      CliConfig.getValue('defaults.schematics.collection');

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
}
