import {CliConfig} from '../models/config';
import { Command } from '../models/command';

const SilentError = require('silent-error');


export interface GetOptions {
  jsonPath: string;
  global?: boolean;
}

export default class GetCommand extends Command {
  public readonly name = 'get';
  public readonly description = 'Get a value from the configuration. Example: ng get [key]';
  public readonly arguments = ['jsonPath'];
  public readonly options = [
    {
      name: 'global',
      type: Boolean,
      'default': false,
      aliases: ['g'],
      description: 'Get the value in the global configuration (in your home directory).'
    }
  ];

  public run(options: GetOptions) {
    return new Promise<void>(resolve => {
      const config = options.global ? CliConfig.fromGlobal() : CliConfig.fromProject();

      if (config === null) {
        throw new SilentError('No config found. If you want to use global configuration, '
          + 'you need the --global argument.');
      }

      const value = config.get(options.jsonPath);

      if (value === null || value === undefined) {
        throw new SilentError('Value cannot be found.');
      } else if (typeof value == 'object') {
        this.logger.info(JSON.stringify(value, null, 2));
      } else {
        this.logger.info(value.toString());
      }
      resolve();
    });
  }
}
