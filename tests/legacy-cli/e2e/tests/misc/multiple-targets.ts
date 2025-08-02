import { expectFileToExist } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  await ng('generate', 'app', 'secondary-app', '--no-zoneless');
  await ng('build', 'secondary-app', '--configuration=development');
  await expectFileToExist('dist/secondary-app/browser/index.html');
  await expectFileToExist('dist/secondary-app/browser/main.js');
}
