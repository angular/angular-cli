import { oneLineTrim } from 'common-tags';
import {
  expectFileNotToExist,
  expectFileToExist,
  expectFileToMatch,
  writeFile,
} from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  await writeFile('browserslist', 'Safari 10.1');
  await ng('build');
  await expectFileNotToExist('dist/test-project/polyfills-es5.js');
  await expectFileNotToExist('dist/test-project/polyfills-nomodule-es5.js');
  await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
    <script src="runtime.js" defer></script>
    <script src="polyfills.js" defer></script>
    <script src="styles.js" defer></script>
    <script src="vendor.js" defer></script>
    <script src="main.js" defer></script>
  `);

  await writeFile('browserslist', `
    IE 9
    Safari 10.1
  `);
  await ng('build');
  await expectFileToExist('dist/test-project/polyfills-nomodule-es5.js');

  if (process.env['NG_BUILD_DIFFERENTIAL_FULL']) {
    await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
      <script src="polyfills-nomodule-es5.js" nomodule defer></script>
      <script src="runtime-es2015.js" type="module"></script>
      <script src="polyfills-es2015.js" type="module"></script>
      <script src="runtime-es5.js" nomodule defer></script>
      <script src="polyfills-es5.js" nomodule defer></script>
      <script src="styles-es2015.js" type="module"></script>
      <script src="styles-es5.js" nomodule defer></script>
      <script src="vendor-es2015.js" type="module"></script>
      <script src="main-es2015.js" type="module"></script>
      <script src="vendor-es5.js" nomodule defer></script>
      <script src="main-es5.js" nomodule defer></script>
    `);
  } else {
    await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
      <script src="polyfills-nomodule-es5.js" nomodule></script>
      <script src="polyfills-es5.js" nomodule defer></script>
      <script src="polyfills-es2015.js" type="module"></script>
      <script src="styles-es2015.js" type="module"></script>
      <script src="styles-es5.js" nomodule defer></script>
      <script src="runtime-es2015.js" type="module"></script>
      <script src="vendor-es2015.js" type="module"></script>
      <script src="main-es2015.js" type="module"></script>
      <script src="runtime-es5.js" nomodule defer></script>
      <script src="vendor-es5.js" nomodule defer></script>
      <script src="main-es5.js" nomodule defer></script>
    `);
  }
}
