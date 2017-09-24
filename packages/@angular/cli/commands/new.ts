import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';

import { CliConfig } from '../models/config';
import { validateProjectName } from '../utilities/validate-project-name';
import { oneLine } from 'common-tags';
import { SchematicAvailableOptions } from '../tasks/schematic-get-options';

const Command = require('../ember-cli/lib/models/command');
const SilentError = require('silent-error');

const NewCommand = Command.extend({
  name: 'new',
  aliases: ['n'],
  description: `Creates a new directory and a new Angular app eg. "ng new [name]".`,
  works: 'outsideProject',

  availableOptions: [
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
      name: 'link-cli',
      type: Boolean,
      default: false,
      aliases: ['lc'],
      description: 'Automatically link the `@angular/cli` package.',
      hidden: true
    },
    {
      name: 'skip-install',
      type: Boolean,
      default: false,
      aliases: ['si'],
      description: 'Skip installing packages.'
    },
    {
      name: 'skip-git',
      type: Boolean,
      default: false,
      aliases: ['sg'],
      description: 'Skip initializing a git repository.'
    },
    {
      name: 'skip-commit',
      type: Boolean,
      default: false,
      aliases: ['sc'],
      description: 'Skip committing the first commit to git.'
    },
    {
      name: 'collection',
      type: String,
      aliases: ['c'],
      description: 'Schematics collection to use.'
    }
  ],

  isProject: function (projectPath: string) {
    return CliConfig.fromProject(projectPath) !== null;
  },

  getCollectionName(rawArgs: string[]) {
    let collectionName = CliConfig.fromGlobal().get('defaults.schematics.collection');
    if (rawArgs) {
      const parsedArgs = this.parseArgs(rawArgs, false);
      if (parsedArgs.options.collection) {
        collectionName = parsedArgs.options.collection;
      }
    }
    return collectionName;
  },

  beforeRun: function (rawArgs: string[]) {
    const isHelp = ['--help', '-h'].includes(rawArgs[0]);
    if (isHelp) {
      return;
    }

    const schematicName = CliConfig.getValue('defaults.schematics.newApp');

    if (/^\d/.test(rawArgs[1])) {
      SilentError.debugOrThrow('@angular/cli/commands/generate',
        `The \`ng new ${rawArgs[0]}\` file name cannot begin with a digit.`);
    }

    const SchematicGetOptionsTask = require('../tasks/schematic-get-options').default;

    const getOptionsTask = new SchematicGetOptionsTask({
      ui: this.ui,
      project: this.project
    });

    return getOptionsTask.run({
      schematicName,
      collectionName: this.getCollectionName(rawArgs)
    })
      .then((availableOptions: SchematicAvailableOptions) => {
        this.registerOptions({
          availableOptions: availableOptions
        });
      });
  },

  run: function (commandOptions: any, rawArgs: string[]) {
    const packageName = rawArgs.shift();

    if (!packageName) {
      return Promise.reject(new SilentError(
        `The "ng ${this.name}" command requires a name argument to be specified eg. ` +
        chalk.yellow('ng new [name] ') +
        `For more details, use "ng help".`));
    }

    validateProjectName(packageName);
    commandOptions.name = packageName;
    if (commandOptions.dryRun) {
      commandOptions.skipGit = true;
    }

    commandOptions.directory = commandOptions.directory || packageName;
    const directoryName = path.join(process.cwd(), commandOptions.directory);

    if (fs.existsSync(directoryName) && this.isProject(directoryName)) {
      throw new SilentError(oneLine`
        Directory ${directoryName} exists and is already an Angular CLI project.
      `);
    }

    if (commandOptions.collection) {
      commandOptions.collectionName = commandOptions.collection;
    } else {
      commandOptions.collectionName = this.getCollectionName(rawArgs);
    }

    const InitTask = require('../tasks/init').default;

    const initTask = new InitTask({
      project: this.project,
      tasks: this.tasks,
      ui: this.ui,
    });

    return initTask.run(commandOptions, rawArgs);
  }
});


NewCommand.overrideCore = true;
export default NewCommand;
