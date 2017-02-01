import { BuildOptions } from '../models/webpack-config';
import { availableOptions, CommandOptions } from './build.options';

const Command = require('../ember-cli/lib/models/command');

// defaults for BuildOptions
export const BaseBuildCommandOptions: any = CommandOptions;

export interface BuildTaskOptions extends BuildOptions {
  watch?: boolean;
}

const BuildCommand = Command.extend({
  name: 'build',
  description: 'Builds your app and places it into the output path (dist/ by default).',
  aliases: ['b'],

  availableOptions: availableOptions,

  run: function (commandOptions: BuildTaskOptions) {
    return require('./build.run').default.call(this, commandOptions);
  }
});


BuildCommand.overrideCore = true;
export default BuildCommand;
