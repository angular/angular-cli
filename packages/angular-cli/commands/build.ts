const Command = require('../ember-cli/lib/models/command');
import WebpackBuild from '../tasks/build-webpack';
import WebpackBuildWatch from '../tasks/build-webpack-watch';

export interface BuildOptions {
  target?: string;
  environment?: string;
  outputPath?: string;
  watch?: boolean;
  watcher?: string;
  supressSizes: boolean;
  baseHref?: string;
  aot?: boolean;
  sourcemap?: boolean;
  vendorChunk?: boolean;
  verbose?: boolean;
  progress?: boolean;
}

const BuildCommand = Command.extend({
  name: 'build',
  description: 'Builds your app and places it into the output path (dist/ by default).',
  aliases: ['b'],

  availableOptions: [
    {
      name: 'target',
      type: String,
      default: 'development',
      aliases: ['t', { 'dev': 'development' }, { 'prod': 'production' }]
    },
    { name: 'environment',    type: String,  default: '', aliases: ['e'] },
    { name: 'output-path',    type: 'Path',  default: null, aliases: ['o'] },
    { name: 'watch',          type: Boolean, default: false, aliases: ['w'] },
    { name: 'watcher',        type: String },
    { name: 'suppress-sizes', type: Boolean, default: false },
    { name: 'base-href',      type: String,  default: null, aliases: ['bh'] },
    { name: 'aot',            type: Boolean, default: false },
    { name: 'sourcemap',      type: Boolean, default: true, aliases: ['sm'] },
    { name: 'vendor-chunk',   type: Boolean, default: true },
    { name: 'verbose',        type: Boolean, default: false },
    { name: 'progress',       type: Boolean, default: true }
  ],

  run: function (commandOptions: BuildOptions) {
    if (commandOptions.environment === '') {
      if (commandOptions.target === 'development') {
        commandOptions.environment = 'dev';
      }
      if (commandOptions.target === 'production') {
        commandOptions.environment = 'prod';
      }
    }

    const project = this.project;
    const ui = this.ui;
    const buildTask = commandOptions.watch ?
      new WebpackBuildWatch({
        cliProject: project,
        ui: ui,
        outputPath: commandOptions.outputPath,
        target: commandOptions.target,
        environment: commandOptions.environment
      }) :
      new WebpackBuild({
        cliProject: project,
        ui: ui,
        outputPath: commandOptions.outputPath,
        target: commandOptions.target,
        environment: commandOptions.environment,
      });

    return buildTask.run(commandOptions);
  }
});


BuildCommand.overrideCore = true;
export default BuildCommand;
