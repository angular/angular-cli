import { assetDir } from '../../../utils/assets';
import { expectFileToExist, symlinkFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';


export default async function () {
  await ng('add', '@angular-devkit-tests/ng-add-simple');
  await expectFileToExist('ng-add-test');
}
