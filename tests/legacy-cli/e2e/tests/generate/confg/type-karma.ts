import { ng } from '../../../utils/process';
import { useCIChrome } from '../../../utils/project';

export default async function () {
  await ng('generate', 'config', 'karma');
  await useCIChrome('test-project');
  await ng('test', '--watch=false');
}
