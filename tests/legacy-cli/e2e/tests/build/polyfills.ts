import { oneLineTrim } from 'common-tags';
import {
  appendToFile,
  expectFileSizeToBeUnder,
  expectFileToExist,
  expectFileToMatch,
  getFileSize,
} from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  // Enable ES5 polyfills to run both size checks
  await appendToFile('.browserslistrc', 'IE 11');

  await ng('build', '--aot=false', '--configuration=development');
  // files were created successfully
  await expectFileToMatch('dist/test-project/polyfills-es5.js', 'core-js/es/reflect');
  await expectFileToMatch('dist/test-project/polyfills-es5.js', 'zone.js');

  await expectFileToMatch(
    'dist/test-project/index.html',
    oneLineTrim`
    <script src="polyfills-es5.js" nomodule defer></script>
    <script src="polyfills.js" defer>
  `,
  );

  const jitPolyfillSize = await getFileSize('dist/test-project/polyfills-es5.js');

  await ng('build', '--aot=true', '--configuration=development');
  // files were created successfully
  await expectFileToExist('dist/test-project/polyfills-es5.js');
  await expectFileSizeToBeUnder('dist/test-project/polyfills-es5.js', jitPolyfillSize);
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/polyfills-es5.js', 'core-js/es/reflect'),
  );
  await expectFileToMatch('dist/test-project/polyfills-es5.js', 'zone.js');

  await expectFileToMatch(
    'dist/test-project/index.html',
    oneLineTrim`
    <script src="polyfills-es5.js" nomodule defer></script>
    <script src="polyfills.js" defer>
  `,
  );
}
