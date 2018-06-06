import { expectFileToExist, expectFileToMatch, rimraf } from '../../../utils/fs';
import { ng } from '../../../utils/process';


export default async function () {
  await ng('add', '@angular-devkit-tests/ng-add-simple');
  await expectFileToMatch('package.json', /@angular-devkit-tests\/ng-add-simple/);
  await expectFileToExist('ng-add-test');
  await rimraf('node_modules/@angular-devkit-tests/ng-add-simple');
}
