import * as Command from 'ember-cli/lib/models/command';
import {Config} from '../models/config';


const SetCommand = Command.extend({
  name: 'set',
  description: 'Set a value in the configuration.',
  works: 'everywhere',

  availableOptions: [
    { name: 'global', type: Boolean, default: false, aliases: ['g'] },
  ],

  run: function (commandOptions, rawArgs): Promise<void> {
    return new Promise(resolve => {
      let config = new Config();

      for (let arg of rawArgs) {
        let [key, value] = arg.split('=');
        config.validatePath(key);
        config.set(key, value);
      }

      config.save();
      resolve();
    });
  }
});

module.exports = SetCommand;
