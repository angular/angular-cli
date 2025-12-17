import { installWorkspacePackages } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { useCIChrome, useSha } from '../../../utils/project';

export default async function () {
  await ng('generate', 'app', 'ngmodules', '--no-standalone', '--skip-install');
  await useSha();
  await installWorkspacePackages();
  await useCIChrome('ngmodules', 'projects/ngmodules');
  await ng('test', 'ngmodules', '--watch=false');
  await ng('build', 'ngmodules');
}
