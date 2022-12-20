import { ng } from '../../../utils/process';

export default async function () {
  await ng('generate', 'config', 'karma');
  await ng('test', '--watch=false');
}
