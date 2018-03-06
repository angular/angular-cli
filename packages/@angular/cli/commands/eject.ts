import { BuildOptions } from '../models/build-options';
import {baseBuildCommandOptions} from './build';

const Command = require('../ember-cli/lib/models/command');

// defaults for BuildOptions
export const baseEjectCommandOptions: any = [
  ...baseBuildCommandOptions,
  {
    name: 'force',
    type: Boolean,
    description: 'Overwrite any webpack.config.js and npm scripts already existing.'
  },
  {
    name: 'app',
    type: String,
    aliases: ['a'],
    description: 'Specifies app name to use.'
  },
  {
    name: 'config',
    type: String,
    description: 'Ejects webpack config to specified file without modifying your project.'
  }
];

export interface EjectTaskOptions extends BuildOptions {
  force?: boolean;
  app?: string;
  config?: string;
}


const EjectCommand = Command.extend({
  name: 'eject',
  description: 'Ejects your app and output the proper webpack configuration and scripts.',

  availableOptions: baseEjectCommandOptions,

  run: function (commandOptions: EjectTaskOptions) {

    const EjectTask = require('../tasks/eject').default;
    const ejectTask = new EjectTask({
      project: this.project,
      ui: this.ui,
    });

    return ejectTask.run(commandOptions);
  }
});


export default EjectCommand;
