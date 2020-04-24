import { expectFileToExist } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';


export default async function () {
  await ng('build');
  await expectFileToExist('dist/test-project/vendor.js');
  await ng('build', '--vendor-chunk=false');
  await expectToFail(() => expectFileToExist('dist/test-project/vendor.js'));
}
