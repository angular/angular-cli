import { expectFileToExist } from '../../utils/fs';
import { expectGitToBeClean } from '../../utils/git';
import { ng } from '../../utils/process';

export default async function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  await ng('build', '--stats-json');

  if (process.env['NG_BUILD_DIFFERENTIAL_FULL']) {
    await expectFileToExist('./dist/test-project/stats-es5.json');
  }
  await expectFileToExist('./dist/test-project/stats-es2015.json');

  await expectGitToBeClean();
}
