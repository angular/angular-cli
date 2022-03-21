import { expectFileToExist } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  await ng('generate', 'app', 'secondary-app');

  await ng('build', 'secondary-app', '--configuration=development');

  expectFileToExist('dist/secondary-app/index.html');
  expectFileToExist('dist/secondary-app/main.js');
}
