import { Command, CommandScope } from '../models/command';
import { BuildOptions } from '../models/build-options';
import {baseBuildCommandOptions} from './build';

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
  }
];

export interface EjectTaskOptions extends BuildOptions {
  force?: boolean;
  app?: string;
}

export default class EjectCommand extends Command {
  public readonly name = 'eject';
  public readonly description =
    'Ejects your app and output the proper webpack configuration and scripts.';
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = [];
  public readonly options = baseEjectCommandOptions;

  public async run(options: EjectTaskOptions) {

    const EjectTask = require('../tasks/eject').default;
    const ejectTask = new EjectTask({
      project: this.project,
      ui: this.ui,
    });

    return await ejectTask.run(options);
  }
}
