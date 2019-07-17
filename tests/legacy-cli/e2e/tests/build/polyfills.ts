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
    await ng('build', '--aot=false');
    // files were created successfully
    await expectFileToMatch('dist/test-project/polyfills-es5.js', 'core-js/proposals/reflect-metadata');
    await expectFileToMatch('dist/test-project/polyfills-es5.js', 'zone.js');
    if (process.env['NG_BUILD_DIFFERENTIAL_FULL']) {
      await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
        <script src="runtime-es2015.js" type="module"></script>
        <script src="polyfills-es2015.js" type="module"></script>
        <script src="runtime-es5.js" nomodule defer></script>
        <script src="polyfills-es5.js" nomodule defer></script>
      `);
    } else {
      await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
        <script src="polyfills-es5.js" nomodule defer></script>
        <script src="polyfills-es2015.js" type="module">
      `);
    }
    const jitPolyfillSize = await getFileSize('dist/test-project/polyfills-es5.js');

    await ng('build', '--aot=true');
    // files were created successfully
    await expectFileToExist('dist/test-project/polyfills-es5.js');
    await expectFileSizeToBeUnder('dist/test-project/polyfills-es5.js', jitPolyfillSize);
    await expectToFail(() => expectFileToMatch('dist/test-project/polyfills-es5.js', 'core-js/proposals/reflect-metadata'));
    await expectFileToMatch('dist/test-project/polyfills-es5.js', 'zone.js');

    if (process.env['NG_BUILD_DIFFERENTIAL_FULL']) {
      await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
        <script src="runtime-es2015.js" type="module"></script>
        <script src="polyfills-es2015.js" type="module"></script>
        <script src="runtime-es5.js" nomodule defer></script>
        <script src="polyfills-es5.js" nomodule defer></script>
      `);
    } else {
      await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
        <script src="polyfills-es5.js" nomodule defer></script>
        <script src="polyfills-es2015.js" type="module">
      `);
    }
}
