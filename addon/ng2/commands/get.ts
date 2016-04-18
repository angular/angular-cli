import * as chalk from 'chalk';
import * as Command from 'ember-cli/lib/models/command';
import {Config} from '../models/config';


const GetCommand = Command.extend({
  name: 'get',
  description: 'Get a value from the configuration.',
  works: 'everywhere',

  availableOptions: [],

  run: function (commandOptions, rawArgs): Promise<void> {
    return new Promise(resolve => {
      const config = new Config();
      config.validatePath(rawArgs[0]);
      const val = config.get(config.config, rawArgs[0]);

      if (val === null) {
        console.error(chalk.red('Value cannot be found.'));
      } else {
        console.log(val);
      }

      resolve();
    });
  }
});

module.exports = GetCommand;
