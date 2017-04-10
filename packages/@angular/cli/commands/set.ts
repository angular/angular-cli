import * as fs from 'fs';
import { CliConfig } from '../models/config';
import { oneLine } from 'common-tags';

const SilentError = require('silent-error');
const chalk = require('chalk');
const Command = require('../ember-cli/lib/models/command');

export interface SetOptions {
  global?: boolean;
}


const SetCommand = Command.extend({
  name: 'set',
  description: 'Set a value in the configuration.',
  works: 'everywhere',

  availableOptions: [
    {
      name: 'global',
      type: Boolean,
      'default': false,
      aliases: ['g'],
      description: 'Set the value in the global configuration rather than in your project\'s.'
    },
  ],

  asBoolean: function (raw: string): boolean {
    if (raw == 'true' || raw == '1') {
      return true;
    } else if (raw == 'false' || raw == '' || raw == '0') {
      return false;
    } else {
      throw new SilentError(`Invalid boolean value: "${raw}"`);
    }
  },
  asNumber: function (raw: string): number {
    if (Number.isNaN(+raw)) {
      throw new SilentError(`Invalid number value: "${raw}"`);
    }
    return +raw;
  },

  run: function (commandOptions: SetOptions, rawArgs: string[]): Promise<void> {
    return new Promise<void>(resolve => {
      const config = commandOptions.global ? CliConfig.fromGlobal() : CliConfig.fromProject();
      if (config === null) {
        throw new SilentError('No config found. If you want to use global configuration, '
          + 'you need the --global argument.');
      }

      let [jsonPath, rawValue] = rawArgs;

      if (rawValue === undefined) {
        [jsonPath, rawValue] = jsonPath.split('=', 2);
        if (rawValue === undefined) {
          throw new SilentError('Must specify a value.');
        }
      }

      const type = config.typeOf(jsonPath);
      let value: any = rawValue;
      switch (type) {
        case 'boolean': value = this.asBoolean(rawValue); break;
        case 'number': value = this.asNumber(rawValue); break;
        case 'string': value = rawValue; break;

        default: value = parseValue(rawValue, jsonPath);
      }

      if (jsonPath.indexOf('prefix') > 0) {
        // update tslint if prefix is updated
        updateLintForPrefix(this.project.root + '/tslint.json', value);
      }

      try {
        config.set(jsonPath, value);
        config.save();
      } catch (error) {
        throw new SilentError(error.message);
      }
      resolve();
    });
  }
});

function updateLintForPrefix(filePath: string, prefix: string): void {
    const tsLint = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const componentLint = tsLint.rules['component-selector'][2];
    if (componentLint instanceof Array) {
      tsLint.rules['component-selector'][2].push(prefix);
    } else {
      tsLint.rules['component-selector'][2] = prefix;
    }

    const directiveLint = tsLint.rules['directive-selector'][2];
    if (directiveLint instanceof Array) {
      tsLint.rules['directive-selector'][2].push(prefix);
    } else {
      tsLint.rules['directive-selector'][2] = prefix;
    }
    fs.writeFileSync(filePath, JSON.stringify(tsLint, null, 2));
    console.log(chalk.yellow(oneLine`we have updated tslint to match prefix,
     you may want to fix linting errors.`));
}

function parseValue(rawValue: string, path: string) {
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    throw new SilentError(`No node found at path ${path}`);
  }
}

export default SetCommand;
