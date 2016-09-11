const SilentError = require('silent-error');
const Command = require('ember-cli/lib/models/command');
import {CliConfig} from '../models/config';


const SetCommand = Command.extend({
  name: 'set',
  description: 'Set a value in the configuration.',
  works: 'everywhere',

  availableOptions: [
    { name: 'global', type: Boolean, default: false, aliases: ['g'] },
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

  run: function (commandOptions: any, rawArgs: string[]): Promise<void> {
    return new Promise(resolve => {
      const [jsonPath, rawValue] = rawArgs;
      const config = CliConfig.fromProject();
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
