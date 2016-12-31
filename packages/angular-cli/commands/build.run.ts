import { Version } from '../upgrade/version';
import WebpackBuild from '../tasks/build-webpack';
import WebpackBuildWatch from '../tasks/build-webpack-watch';
import { BuildOptions } from './build';

export default function buildRun(commandOptions: BuildOptions) {
  if (commandOptions.environment === '') {
    if (commandOptions.target === 'development') {
      commandOptions.environment = 'dev';
    }
    if (commandOptions.target === 'production') {
      commandOptions.environment = 'prod';
    }
  }

  const project = this.project;

  // Check angular version.
  Version.assertAngularVersionIs2_3_1OrHigher(project.root);

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
