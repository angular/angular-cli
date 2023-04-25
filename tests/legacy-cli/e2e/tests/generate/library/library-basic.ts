import { ng } from '../../../utils/process';
import { useCIChrome } from '../../../utils/project';

export default async function () {
  await ng('generate', 'library', 'lib-ngmodule', '--no-standalone');
  await useCIChrome('lib-ngmodule', 'projects/lib-ngmodule');
  await ng('test', 'lib-ngmodule', '--no-watch');
  await ng('build', 'lib-ngmodule');
}
