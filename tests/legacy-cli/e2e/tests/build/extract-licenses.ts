import { expectFileToExist, expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function() {
  // Licenses should be left intact if extraction is disabled
  await ng('build', '--prod', '--extract-licenses=false', '--output-hashing=none');

  await expectToFail(() => expectFileToExist('dist/test-project/3rdpartylicenses.txt'));
  await expectFileToMatch('dist/test-project/main-es2015.js', '@license');
  await expectFileToMatch('dist/test-project/main-es5.js', '@license');

  // Licenses should be removed if extraction is enabled
  await ng('build', '--prod', '--extract-licenses', '--output-hashing=none');

  await expectFileToExist('dist/test-project/3rdpartylicenses.txt');
  await expectToFail(() => expectFileToMatch('dist/test-project/main-es2015.js', '@license'));
  await expectToFail(() => expectFileToMatch('dist/test-project/main-es5.js', '@license'));
}
