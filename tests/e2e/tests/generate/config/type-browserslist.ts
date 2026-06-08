import { ng } from '../../../utils/process';

export default async function () {
  await ng('generate', 'config', 'browserslist');
  await ng('build');
}
