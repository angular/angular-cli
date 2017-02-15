import { BuildOptions } from '../models/build-options';
import { Version } from '../upgrade/version';
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
    const project = this.project;

    // Check angular version.
    Version.assertAngularVersionIs2_3_1OrHigher(project.root);

    const BuildTask = require('../tasks/build').default;

    const buildTask = new BuildTask({
      cliProject: project,
      ui: this.ui,
    });

    return buildTask.run(commandOptions);
  }
});


BuildCommand.overrideCore = true;
export default BuildCommand;
