import { Version } from '../upgrade/version';
import WebpackBuild from '../tasks/build-webpack';
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

  if (!commandOptions.outputHashing) {
    if (commandOptions.target === 'development') {
      commandOptions.outputHashing = 'none';
    }
    if (commandOptions.target === 'production') {
      commandOptions.outputHashing = 'all';
    }
  }

  if (typeof commandOptions.sourcemap === 'undefined') {
    if (commandOptions.target == 'development') {
      commandOptions.sourcemap = true;
    }
    if (commandOptions.target == 'production') {
      commandOptions.sourcemap = false;
    }
  }

  const project = this.project;

  // Check angular version.
  Version.assertAngularVersionIs2_3_1OrHigher(project.root);

  const buildTask = new WebpackBuild({
      cliProject: project,
      ui: this.ui,
      outputPath: commandOptions.outputPath,
      target: commandOptions.target,
      environment: commandOptions.environment,
    });

  return buildTask.run(commandOptions);
}
