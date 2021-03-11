import { oneLineTrim } from 'common-tags';
import {
  expectFileSizeToBeUnder,
  expectFileToExist,
  expectFileToMatch,
  getFileSize,
  replaceInFile,
} from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  // Enable Differential loading to run both size checks
  await replaceInFile(
    '.browserslistrc',
    'not IE 11',
    'IE 11',
  );

  await ng('build', '--aot=false', '--configuration=development');
  // files were created successfully
  await expectFileToMatch('dist/test-project/polyfills-es5.js', 'core-js/proposals/reflect-metadata');
  await expectFileToMatch('dist/test-project/polyfills-es5.js', 'zone.js');

  await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
    <script src="polyfills-es5.js" nomodule defer></script>
    <script src="polyfills-es2017.js" type="module">
  `);

  const jitPolyfillSize = await getFileSize('dist/test-project/polyfills-es5.js');

  await ng('build', '--aot=true', '--configuration=development');
  // files were created successfully
  await expectFileToExist('dist/test-project/polyfills-es5.js');
  await expectFileSizeToBeUnder('dist/test-project/polyfills-es5.js', jitPolyfillSize);
  await expectToFail(() => expectFileToMatch('dist/test-project/polyfills-es5.js', 'core-js/proposals/reflect-metadata'));
  await expectFileToMatch('dist/test-project/polyfills-es5.js', 'zone.js');

  await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
    <script src="polyfills-es5.js" nomodule defer></script>
    <script src="polyfills-es2017.js" type="module">
  `);
}
