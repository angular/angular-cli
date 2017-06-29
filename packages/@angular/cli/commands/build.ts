import { CliConfig } from '../models/config';
import { BuildOptions } from '../models/build-options';
import { Version } from '../upgrade/version';
import { oneLine } from 'common-tags';

const Command = require('../ember-cli/lib/models/command');

const config = CliConfig.fromProject() || CliConfig.fromGlobal();
const pollDefault = config.config.defaults && config.config.defaults.poll;

// defaults for BuildOptions
export const baseBuildCommandOptions: any = [
  {
    name: 'target',
    type: String,
    default: 'development',
    aliases: ['t', { 'dev': 'development' }, { 'prod': 'production' }],
    description: 'Defines the build target.'
  },
  {
    name: 'environment',
    type: String,
    aliases: ['e'] ,
    description: 'Defines the build environment.'
  },
  {
    name: 'output-path',
    type: 'Path',
    aliases: ['op'],
    description: 'Path where output will be placed.'
  },
  {
    name: 'aot',
    type: Boolean,
    description: 'Build using Ahead of Time compilation.'
  },
  {
    name: 'sourcemaps',
    type: Boolean,
    aliases: ['sm', 'sourcemap'],
    description: 'Output sourcemaps.'
  },
  {
    name: 'vendor-chunk',
    type: Boolean,
    default: true,
    aliases: ['vc'],
    description: 'Use a separate bundle containing only vendor libraries.'
  },
  {
    name: 'base-href',
    type: String,
    aliases: ['bh'],
    description: 'Base url for the application being built.'
  },
  {
    name: 'deploy-url',
    type: String,
    aliases: ['d'],
    description: 'URL where files will be deployed.'
  },
  {
    name: 'verbose',
    type: Boolean,
    default: false,
    aliases: ['v'],
    description: 'Adds more details to output logging.'
  },
  {
    name: 'progress',
    type: Boolean,
    default: true,
    aliases: ['pr'],
    description: 'Log progress to the console while building.'
  },
  {
    name: 'i18n-file',
    type: String,
    description: 'Localization file to use for i18n.'
  },
  {
    name: 'i18n-format',
    type: String,
    description: 'Format of the localization file specified with --i18n-file.'
  },
  {
    name: 'locale',
    type: String,
    description: 'Locale to use for i18n.'
  },
  {
    name: 'extract-css',
    type: Boolean,
    aliases: ['ec'],
    description: 'Extract css from global styles onto css files instead of js ones.'
  },
  {
    name: 'watch',
    type: Boolean,
    default: false,
    aliases: ['w'],
    description: 'Run build when files change.'
  },
  {
    name: 'output-hashing',
    type: String,
    values: ['none', 'all', 'media', 'bundles'],
    description: 'Define the output filename cache-busting hashing mode.',
    aliases: ['oh']
  },
  {
    name: 'poll',
    type: Number,
    default: pollDefault,
    description: 'Enable and define the file watching poll time period (milliseconds).'
  },
  {
    name: 'app',
    type: String,
    aliases: ['a'],
    description: 'Specifies app name or index to use.'
  },
  {
    name: 'delete-output-path',
    type: Boolean,
    default: true,
    aliases: ['dop'],
    description: 'Delete output path before build.'
  },
  {
    name: 'preserve-symlinks',
    type: Boolean,
    default: false,
    description: 'Do not use the real path when resolving modules.'
  },
  {
    name: 'extract-licenses',
    type: Boolean,
    default: true,
    description: 'Extract all licenses in a separate file, in the case of production builds only.'
  },
  {
    name: 'show-circular-dependencies',
    type: Boolean,
    aliases: ['scd'],
    description: 'Show circular dependency warnings on builds.'
  }
];

export interface BuildTaskOptions extends BuildOptions {
  statsJson?: boolean;
}

const BuildCommand = Command.extend({
  name: 'build',
  description: 'Builds your app and places it into the output path (dist/ by default).',
  aliases: ['b'],

  availableOptions: baseBuildCommandOptions.concat([
    {
       name: 'stats-json',
       type: Boolean,
       default: false,
       description: oneLine`Generates a \`stats.json\` file which can be analyzed using tools
       such as: \`webpack-bundle-analyzer\` or https://webpack.github.io/analyse.`
      }
  ]),

  run: function (commandOptions: BuildTaskOptions) {
    // Check angular version.
    Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);

    const BuildTask = require('../tasks/build').default;

    const buildTask = new BuildTask({
      project: this.project,
      ui: this.ui,
    });

    return buildTask.run(commandOptions);
  }
});


BuildCommand.overrideCore = true;
export default BuildCommand;
