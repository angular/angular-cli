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
  await expectFileToMatch('dist/test-project/browser/polyfills.js', 'zone.js');
  await expectFileToMatch(
    'dist/test-project/browser/index.html',
    '<script src="polyfills.js" type="module">',
  );

  await ng('build', '--aot=true', '--configuration=development');

  // files were created successfully
  await expectFileToExist('dist/test-project/browser/polyfills.js');
  await expectFileToMatch('dist/test-project/browser/polyfills.js', 'zone.js');
  await expectFileToMatch(
    'dist/test-project/browser/index.html',
    '<script src="polyfills.js" type="module">',
  );
}
