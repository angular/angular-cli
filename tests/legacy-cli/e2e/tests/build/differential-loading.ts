import { oneLineTrim } from 'common-tags';
import { appendToFile, expectFileToMatch, writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function () {
  // Enable Differential loading to run both size checks
  await appendToFile('.browserslistrc', 'IE 11');

  await writeMultipleFiles({
    'src/string-script.js': "console.log('string-script'); var number = 1+1;",
    'src/pre-rename-script.js': "console.log('pre-rename-script');",
  });

  await updateJsonFile('angular.json', (configJson) => {
    const appArchitect = configJson.projects['test-project'].architect;
    appArchitect.build.options.scripts = [
      { input: 'src/string-script.js' },
      { input: 'src/pre-rename-script.js', bundleName: 'renamed-script' },
    ];
  });

  await ng(
    'build',
    '--extract-css',
    '--vendor-chunk',
    '--optimization',
    '--configuration=development',
  );

  // index.html lists the right bundles
  await expectFileToMatch(
    'dist/test-project/index.html',
    oneLineTrim`
    <script src="runtime-es2017.js" type="module"></script>
    <script src="runtime-es5.js" nomodule defer></script>
    <script src="polyfills-es5.js" nomodule defer></script>
    <script src="polyfills-es2017.js" type="module"></script>
    <script src="scripts.js" defer></script>
    <script src="renamed-script.js" defer></script>
    <script src="vendor-es2017.js" type="module"></script>
    <script src="vendor-es5.js" nomodule defer></script>
    <script src="main-es2017.js" type="module"></script>
    <script src="main-es5.js" nomodule defer></script>
  `,
  );

  await expectFileToMatch('dist/test-project/vendor-es2017.js', /class \w{constructor\(/);
  await expectToFail(() =>
    expectFileToMatch('dist/test-project/vendor-es5.js', /class \w{constructor\(/),
  );
}
