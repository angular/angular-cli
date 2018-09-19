import { expectFileToExist, expectFileToMatch, rimraf } from '../../../utils/fs';
import { ng } from '../../../utils/process';


export default async function () {
  await ng('add', '@angular-devkit-tests/ng-add-simple@^1.0.0');
  await expectFileToMatch('package.json', /\/ng-add-simple.*\^1\.0\.0/);
  await expectFileToExist('ng-add-test');
  await rimraf('node_modules/@angular-devkit-tests/ng-add-simple');
}
