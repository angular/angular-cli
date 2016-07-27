import * as Command from 'ember-cli/lib/models/command';
import * as WebpackBuild from '../tasks/build-webpack';
import * as WebpackBuildWatch from '../tasks/build-webpack-watch';

interface BuildOptions {
  target?: string;
  environment?: string;
  outputPath?: string;
  watch?: boolean;
  watcher?: string;
  supressSizes: boolean;
}

module.exports = Command.extend({
  name: 'build',
  description: 'Builds your app and places it into the output path (dist/ by default).',
  aliases: ['b'],

  availableOptions: [
    { name: 'target',         type: String,  default: 'development', aliases: ['t', { 'dev': 'development' }, { 'prod': 'production' }] },
    { name: 'environment',    type: String,  default: '', aliases: ['e'] },
    { name: 'output-path',    type: 'Path',  default: 'dist/',       aliases: ['o'] },
    { name: 'watch',          type: Boolean, default: false,         aliases: ['w'] },
    { name: 'watcher',        type: String },
    { name: 'suppress-sizes', type: Boolean, default: false }
  ],

  run: function (commandOptions: BuildOptions) {
    if (commandOptions.environment === ''){
      if (commandOptions.target === 'development') {
        commandOptions.environment = 'dev';
      }
      if (commandOptions.target === 'production') {
        commandOptions.environment = 'prod';
      } 
    }

    var project = this.project;
    var ui = this.ui;
    var buildTask = commandOptions.watch ?
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

module.exports.overrideCore = true;
