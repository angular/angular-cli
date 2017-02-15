import { CliConfig } from '../models/config';
import { availableOptions } from './get.options';

const SilentError = require('silent-error');
const Command = require('../ember-cli/lib/models/command');


export interface GetOptions {
  global?: boolean;
}


const GetCommand = Command.extend({
  name: 'get',
  description: 'Get a value from the configuration.',
  works: 'everywhere',

  availableOptions: availableOptions,

  run: function (commandOptions: GetOptions, rawArgs: string[]): Promise<void> {
    return new Promise<void>(resolve => {
      const config = commandOptions.global ? CliConfig.fromGlobal() : CliConfig.fromProject();

      if (config === null) {
        throw new SilentError('No config found. If you want to use global configuration, '
          + 'you need the --global argument.');
      }

      const value = config.get(rawArgs[0]);

      if (value === null || value === undefined) {
        throw new SilentError('Value cannot be found.');
      } else if (typeof value == 'object') {
        console.log(JSON.stringify(value));
      } else {
        console.log(value);
      }
      resolve();
    });
  }
});

export default GetCommand;
