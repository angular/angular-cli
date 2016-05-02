import * as chalk from 'chalk';
import * as Command from 'ember-cli/lib/models/command';
import {CliConfig} from '../models/config';


const GetCommand = Command.extend({
  name: 'get',
  description: 'Get a value from the configuration.',
  works: 'everywhere',

  availableOptions: [],

  run: function (commandOptions, rawArgs): Promise<void> {
    return new Promise(resolve => {
      const value = new CliConfig().get(rawArgs[0]);
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

module.exports = GetCommand;
