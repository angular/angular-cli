import { Version } from '../upgrade/version';
import Build from '../tasks/build';
import { BuildTaskOptions } from './build';

export default function buildRun(commandOptions: BuildTaskOptions) {
  const project = this.project;

  // Check angular version.
  Version.assertAngularVersionIs2_3_1OrHigher(project.root);

  const buildTask = new Build({
      cliProject: project,
      ui: this.ui,
    });

  return buildTask.run(commandOptions);
}
