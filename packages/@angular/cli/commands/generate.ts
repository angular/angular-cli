import { cyan, yellow } from 'chalk';
const stringUtils = require('ember-cli-string-utils');
import { oneLine } from 'common-tags';
import { CliConfig } from '../models/config';

import 'rxjs/add/observable/of';
import 'rxjs/add/operator/ignoreElements';
import {
  getCollection,
  getEngineHost
} from '../utilities/schematics';
import { DynamicPathOptions, dynamicPathParser } from '../utilities/dynamic-path-parser';
import { getAppFromConfig } from '../utilities/app-utils';
import * as path from 'path';
import { SchematicAvailableOptions } from '../tasks/schematic-get-options';

const Command = require('../ember-cli/lib/models/command');
const SilentError = require('silent-error');

const separatorRegEx = /[\/\\]/g;


export default Command.extend({
  name: 'generate',
  description: 'Generates and/or modifies files based on a schematic.',
  aliases: ['g'],

  availableOptions: [
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
      aliases: ['lf'],
      description: 'Use lint to fix files after generation.'
    }
  ],

  anonymousOptions: [
    '<schematic>'
  ],

  getCollectionName(rawArgs: string[]) {
    let collectionName = CliConfig.getValue('defaults.schematics.collection');
    if (rawArgs) {
      const parsedArgs = this.parseArgs(rawArgs, false);
      if (parsedArgs.options.collection) {
        collectionName = parsedArgs.options.collection;
      }
    }
    return collectionName;
  },

  beforeRun: function(rawArgs: string[]) {

    const isHelp = ['--help', '-h'].includes(rawArgs[0]);
    if (isHelp) {
      return;
    }

    const schematicName = rawArgs[0];
    if (!schematicName) {
      return Promise.reject(new SilentError(oneLine`
          The "ng generate" command requires a
          schematic name to be specified.
          For more details, use "ng help".
      `));
    }

    if (/^\d/.test(rawArgs[1])) {
      SilentError.debugOrThrow('@angular/cli/commands/generate',
        `The \`ng generate ${schematicName} ${rawArgs[1]}\` file name cannot begin with a digit.`);
    }

    const SchematicGetOptionsTask = require('../tasks/schematic-get-options').default;

    const getOptionsTask = new SchematicGetOptionsTask({
      ui: this.ui,
      project: this.project
    });
    const collectionName = this.getCollectionName(rawArgs);

    return getOptionsTask.run({
        schematicName,
        collectionName
      })
      .then((availableOptions: SchematicAvailableOptions) => {
        let anonymousOptions: string[] = [];
        if (collectionName === '@schematics/angular' && schematicName === 'interface') {
          anonymousOptions = ['<type>'];
        }

        this.registerOptions({
          anonymousOptions: anonymousOptions,
          availableOptions: availableOptions
        });
      });
  },

  run: function (commandOptions: any, rawArgs: string[]) {
    if (rawArgs[0] === 'module' && !rawArgs[1]) {
      throw 'The `ng generate module` command requires a name to be specified.';
    }

    const entityName = rawArgs[1];
    commandOptions.name = stringUtils.dasherize(entityName.split(separatorRegEx).pop());

    const appConfig = getAppFromConfig(commandOptions.app);
    const dynamicPathOptions: DynamicPathOptions = {
      project: this.project,
      entityName: entityName,
      appConfig: appConfig,
      dryRun: commandOptions.dryRun
    };
    const parsedPath = dynamicPathParser(dynamicPathOptions);
    commandOptions.sourceDir = appConfig.root;
    commandOptions.path = parsedPath.dir
      .replace(appConfig.root + path.sep, '')
      .replace(separatorRegEx, '/');

    const cwd = this.project.root;
    const schematicName = rawArgs[0];

    if (['component', 'c', 'directive', 'd'].indexOf(schematicName) !== -1) {
      if (commandOptions.prefix === undefined) {
        commandOptions.prefix = appConfig.prefix;
      }

      if (schematicName === 'component' || schematicName === 'c') {
        if (commandOptions.styleext === undefined) {
          commandOptions.styleext = CliConfig.getValue('defaults.styleExt');
        }
      }
    }

    const SchematicRunTask = require('../tasks/schematic-run').default;
    const schematicRunTask = new SchematicRunTask({
      ui: this.ui,
      project: this.project
    });
    const collectionName = this.getCollectionName(rawArgs);

    if (collectionName === '@schematics/angular' && schematicName === 'interface' && rawArgs[2]) {
      commandOptions.type = rawArgs[2];
    }

    return schematicRunTask.run({
        taskOptions: commandOptions,
        workingDir: cwd,
        collectionName,
        schematicName
      });
  },

  printDetailedHelp: function () {
    const engineHost = getEngineHost();
    const collectionName = this.getCollectionName();
    const collection = getCollection(collectionName);
    const schematicNames: string[] = engineHost.listSchematics(collection);
    this.ui.writeLine(cyan('Available schematics:'));
    schematicNames.forEach(schematicName => {
      this.ui.writeLine(yellow(`    ${schematicName}`));
    });
    this.ui.writeLine('');
  }
});
