import * as chalk from 'chalk';
import {CliConfig} from '../models/config';

const Command = require('ember-cli/lib/models/command');

const GetCommand = Command.extend({
  name: 'get',
  description: 'Get a value from the configuration.',
  works: 'everywhere',

  availableOptions: [],

  run: function (commandOptions: any, rawArgs: string[]): Promise<void> {
    return new Promise(resolve => {
      const config = CliConfig.fromProject();
      const value = config.get(rawArgs[0]);

      if (value === null) {
        console.error(chalk.red('Value cannot be found.'));
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
