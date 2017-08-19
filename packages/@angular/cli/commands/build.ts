import {BuildOptions} from '../models/build-options';
import {Version} from '../upgrade/version';

const Command = require('../ember-cli/lib/models/command');

// defaults for BuildOptions
export const baseBuildCommandOptions: any = [
  {
    name: 'app',
    type: String,
    aliases: ['a'],
    description: 'Specifies app name or index to use.'
  },
  {
    name: 'watch',
    type: Boolean,
    default: false,
    aliases: ['w'],
    description: 'Run build when files change.'
  }
];

export interface BuildTaskOptions extends BuildOptions {
  statsJson?: boolean;
}

const BuildCommand = Command.extend({
  name: 'build',
  description: 'Builds your app.',
  aliases: ['b'],

  availableOptions: baseBuildCommandOptions,

  run: function (commandOptions: BuildTaskOptions, rawArgs: string[]) {
    // Check angular version.
    Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);

    const app = (rawArgs.length > 0 && !rawArgs[0].startsWith('-')) ?
      rawArgs[0] : commandOptions.app;

    const BuildTask = require('../tasks/build').default;

    const buildTask = new BuildTask({
      project: this.project,
      ui: this.ui,
      app
    });

    return buildTask.run(commandOptions);
  }
});


BuildCommand.overrideCore = true;
export default BuildCommand;
