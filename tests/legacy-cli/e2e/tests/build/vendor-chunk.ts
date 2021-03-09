import { expectFileToExist } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';


export default async function () {
  await ng('build', '--configuration=development');
  await expectFileToExist('dist/test-project/vendor.js');
  await ng('build', '--configuration=development', '--vendor-chunk=false');
  await expectToFail(() => expectFileToExist('dist/test-project/vendor.js'));
}
