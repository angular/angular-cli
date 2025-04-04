import { ng } from '../../../utils/process';
import { useCIChrome } from '../../../utils/project';

export default async function () {
  await ng('generate', 'app', 'standalone', '--zoneless', '--standalone');
  await useCIChrome('standalone', 'projects/standalone');
  await ng('test', 'standalone', '--watch=false');
  await ng('build', 'standalone');

  await ng('generate', 'app', 'ngmodules', '--zoneless', '--no-standalone', '--skip-install');
  await useCIChrome('ngmodules', 'projects/ngmodules');
  await ng('test', 'ngmodules', '--watch=false');
  await ng('build', 'ngmodules');
}
