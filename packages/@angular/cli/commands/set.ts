import {CliConfig} from '../models/config';

const SilentError = require('silent-error');
const Command = require('../ember-cli/lib/models/command');


export interface SetOptions {
  global?: boolean;
}


const SetCommand = Command.extend({
  name: 'set',
  description: 'Set a value in the configuration.',
  works: 'everywhere',

  availableOptions: [
    { name: 'global', type: Boolean, 'default': false, aliases: ['g'] },
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

        default: value = JSON.parse(rawValue);
      }

      config.set(jsonPath, value);
      config.save();
      resolve();
    });
  }
});

export default SetCommand;
