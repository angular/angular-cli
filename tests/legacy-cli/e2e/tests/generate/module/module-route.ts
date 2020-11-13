import { expectFileToExist } from '../../../utils/fs';
import { ng } from '../../../utils/process';

export default async function () {
  await ng('config', 'schematics.@schematics/angular.component.style', 'scss');

  await ng('generate', 'module', 'test', '--routing');

  await ng('generate', 'module', 'home', '-m', 'test', '--route', 'home', '--routing');

  await expectFileToExist('src/app/home/home.component.scss');
}
