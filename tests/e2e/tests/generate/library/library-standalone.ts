import { ng } from '../../../utils/process';
import { useCIChrome } from '../../../utils/project';

export default async function () {
  await ng('generate', 'library', 'lib-standalone', '--standalone');
  await useCIChrome('lib-standalone', 'projects/lib-standalone');
  await ng('test', 'lib-standalone', '--no-watch');
  await ng('build', 'lib-standalone');
}
