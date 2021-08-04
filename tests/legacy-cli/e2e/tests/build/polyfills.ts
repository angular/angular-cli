import { oneLineTrim } from 'common-tags';
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
  await expectFileToMatch('dist/test-project/polyfills.js', 'core-js/proposals/reflect-metadata');
  await expectFileToMatch('dist/test-project/polyfills.js', 'zone.js');
  await expectFileToMatch(
    'dist/test-project/index.html',
    '<script src="polyfills.js" type="module">',
  );
  const jitPolyfillSize = await getFileSize('dist/test-project/polyfills.js');

  await ng('build', '--aot=true', '--configuration=development');

  // files were created successfully
  await expectFileToExist('dist/test-project/polyfills.js');
  await expectFileSizeToBeUnder('dist/test-project/polyfills.js', jitPolyfillSize);
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/polyfills.js', 'core-js/proposals/reflect-metadata'),
  );
  await expectFileToMatch('dist/test-project/polyfills.js', 'zone.js');
  await expectFileToMatch(
    'dist/test-project/index.html',
    '<script src="polyfills.js" type="module">',
  );
}
