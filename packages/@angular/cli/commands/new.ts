import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

import { Command, CommandScope } from '../models/command';
import { CliConfig } from '../models/config';
import { validateProjectName } from '../utilities/validate-project-name';
import { oneLine } from 'common-tags';
import { SchematicAvailableOptions } from '../tasks/schematic-get-options';

const SilentError = require('silent-error');

export default class NewCommand extends Command {
  public readonly name = 'new';
  public readonly description =
    'Creates a new directory and a new Angular app eg. "ng new [name]".';
  public static aliases = ['n'];
  public scope = CommandScope.outsideProject;
  public arguments = ['name'];
  public options = [
    {
      name: 'dry-run',
      type: Boolean,
      default: false,
      aliases: ['d'],
      description: oneLine`
        Run through without making any changes.
        Will list all files that would have been created when running "ng new".
      `
    },
    {
      name: 'verbose',
      type: Boolean,
      default: false,
      aliases: ['v'],
      description: 'Adds more details to output logging.'
    },
    {
      name: 'collection',
      type: String,
      aliases: ['c'],
      description: 'Schematics collection to use.'
    }
  ];

  private initialized = false;
  public initialize(options: any) {
    if (this.initialized) {
      return Promise.resolve();
    }
    this.initialized = true;

    const collectionName = this.parseCollectionName(options);
    const schematicName = CliConfig.fromGlobal().get('defaults.schematics.newApp');

    const SchematicGetOptionsTask = require('../tasks/schematic-get-options').default;

    const getOptionsTask = new SchematicGetOptionsTask({
      ui: this.ui,
      project: this.project
    });

    return getOptionsTask.run({
        schematicName,
        collectionName
      })
      .then((availableOptions: SchematicAvailableOptions[]) => {
        if (availableOptions) {
          availableOptions = availableOptions.filter(opt => opt.name !== 'name');
        }

        this.options = this.options.concat( availableOptions || []);
      });
  }

  public async run(options: any) {
    if (!options.name) {
      return Promise.reject(new SilentError(
        `The "ng ${options.name}" command requires a name argument to be specified eg. ` +
        chalk.yellow('ng new [name] ') +
        `For more details, use "ng help".`));
    }

    validateProjectName(options.name);
    options.name = options.name;
    if (options.dryRun) {
      options.skipGit = true;
    }

    options.directory = options.directory || options.name;
    const directoryName = path.join(process.cwd(), options.directory);

    if (fs.existsSync(directoryName) && this.isProject(directoryName)) {
      throw new SilentError(oneLine`
        Directory ${directoryName} exists and is already an Angular CLI project.
      `);
    }

    if (options.collection) {
      options.collectionName = options.collection;
    } else {
      options.collectionName = this.parseCollectionName(options);
    }

    const InitTask = require('../tasks/init').default;

    const initTask = new InitTask({
      project: this.project,
      ui: this.ui,
    });

    // Ensure skipGit has a boolean value.
    options.skipGit = options.skipGit === undefined ? false : options.skipGit;

    return await initTask.run(options);
  }

  private isProject(projectPath: string): boolean {
    return CliConfig.fromProject(projectPath) !== null;
  }

  private parseCollectionName(options: any): string {
    let collectionName: string =
      options.collection ||
      options.c ||
      CliConfig.getValue('defaults.schematics.collection');

    return collectionName;
  }
}
