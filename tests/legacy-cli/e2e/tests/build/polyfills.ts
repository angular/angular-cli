import {
  expectFileSizeToBeUnder,
  expectFileToExist,
  expectFileToMatch,
  getFileSize,
} from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  await ng('build', '--aot=false', '--configuration=development');

  // files were created successfully
  await expectFileToMatch('dist/test-project/polyfills.js', 'zone.js');
  await expectFileToMatch(
    'dist/test-project/index.html',
    '<script src="polyfills.js" type="module">',
  );

  await ng('build', '--aot=true', '--configuration=development');

  // files were created successfully
  await expectFileToExist('dist/test-project/polyfills.js');
  await expectFileToMatch('dist/test-project/polyfills.js', 'zone.js');
  await expectFileToMatch(
    'dist/test-project/index.html',
    '<script src="polyfills.js" type="module">',
  );
}
