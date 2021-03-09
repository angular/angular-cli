import { oneLineTrim } from 'common-tags';
import { expectFileNotToExist, expectFileToMatch, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  await updateJsonFile('tsconfig.json', configJson => {
    const compilerOptions = configJson['compilerOptions'];
    compilerOptions['target'] = 'es5';
  });

  await writeFile('.browserslistrc', 'last 2 Chrome versions');
  await ng('build', '--configuration=development');
  await expectFileNotToExist('dist/test-project/polyfills-es5.js');
  await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
    <script src="runtime.js" defer></script>
    <script src="polyfills.js" defer></script>
    <script src="vendor.js" defer></script>
    <script src="main.js" defer></script>
  `);

  await writeFile('.browserslistrc', 'IE 10');
  await ng('build', '--configuration=development');
  await expectFileToMatch('dist/test-project/polyfills-es5.js', 'core-js');
  await expectFileToMatch('dist/test-project/index.html', oneLineTrim`
    <script src="runtime.js" defer></script>
    <script src="polyfills-es5.js" nomodule defer></script>
    <script src="polyfills.js" defer></script>
    <script src="vendor.js" defer></script>
    <script src="main.js" defer></script>
  `);
}
