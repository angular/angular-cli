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
    await ng('build');
    // files were created successfully
    await expectFileToMatch('dist/test-project/polyfills.js', 'core-js/es7/reflect');
    await expectFileToMatch('dist/test-project/polyfills.js', 'zone.js');
    expectFileToMatch('dist/test-project/index.html', oneLineTrim`
      <script src="runtime.js"></script>
      <script src="polyfills.es5.js" nomodule></script>
      <script src="polyfills.js"></script>
    `);
    const jitPolyfillSize = await getFileSize('dist/test-project/polyfills.js');

    await ng('build', '--aot');
    // files were created successfully
    await expectFileToExist('dist/test-project/polyfills.js');
    await expectFileSizeToBeUnder('dist/test-project/polyfills.js', jitPolyfillSize);
    await expectToFail(() => expectFileToMatch('dist/test-project/polyfills.js', 'core-js/es7/reflect'));
    await expectFileToMatch('dist/test-project/polyfills.js', 'zone.js');
    expectFileToMatch('dist/test-project/index.html', oneLineTrim`
      <script src="runtime.js"></script>
      <script src="polyfills.es5.js" nomodule></script>
      <script src="polyfills.js"></script>
    `);
}
