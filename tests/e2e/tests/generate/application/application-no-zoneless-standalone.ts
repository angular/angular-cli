import { installWorkspacePackages, uninstallPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { useCIChrome, useSha } from '../../../utils/project';

export default async function () {
  try {
    await ng('generate', 'app', 'standalone', '--standalone', '--skip-install', '--no-zoneless');
    await useSha();
    await installWorkspacePackages();
    await useCIChrome('standalone', 'projects/standalone');
    await ng('test', 'standalone', '--watch=false');
    await ng('build', 'standalone');
  } finally {
    await uninstallPackage('zone.js');
  }
}
