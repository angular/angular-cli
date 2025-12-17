import { installWorkspacePackages, uninstallPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { useCIChrome, useSha } from '../../../utils/project';

export default async function () {
  try {
    await ng('generate', 'app', 'ngmodules', '--no-standalone', '--skip-install', '--no-zoneless');
    await useSha();
    await installWorkspacePackages();
    await useCIChrome('ngmodules', 'projects/ngmodules');
    await ng('test', 'ngmodules', '--watch=false');
    await ng('build', 'ngmodules');
  } finally {
    await uninstallPackage('zone.js');
  }
}
