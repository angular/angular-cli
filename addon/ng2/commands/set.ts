import * as Command from 'ember-cli/lib/models/command';
import {CliConfig} from '../models/config';


const SetCommand = Command.extend({
  name: 'set',
  description: 'Set a value in the configuration.',
  works: 'everywhere',

  availableOptions: [
    { name: 'global', type: Boolean, default: false, aliases: ['g'] },
  ],

  run: function (commandOptions, rawArgs): Promise<void> {
    return new Promise(resolve => {
      const config = new CliConfig();
      config.set(rawArgs[0], rawArgs[1], commandOptions.force);
      config.save();
      resolve();
    });
  }
});

module.exports = SetCommand;
