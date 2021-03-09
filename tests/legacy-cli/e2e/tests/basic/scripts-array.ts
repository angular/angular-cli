import { oneLineTrim } from 'common-tags';
import { appendToFile, expectFileToMatch, writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  await writeMultipleFiles({
    'src/string-script.js': "console.log('string-script'); var number = 1+1;",
    'src/zstring-script.js': "console.log('zstring-script');",
    'src/fstring-script.js': "console.log('fstring-script');",
    'src/ustring-script.js': "console.log('ustring-script');",
    'src/bstring-script.js': "console.log('bstring-script');",
    'src/astring-script.js': "console.log('astring-script');",
    'src/cstring-script.js': "console.log('cstring-script');",
    'src/input-script.js': "console.log('input-script');",
    'src/lazy-script.js': "console.log('lazy-script');",
    'src/pre-rename-script.js': "console.log('pre-rename-script');",
    'src/pre-rename-lazy-script.js': "console.log('pre-rename-lazy-script');",
  });

  await appendToFile('src/main.ts', "import './string-script.js';");

  await updateJsonFile('angular.json', configJson => {
    const appArchitect = configJson.projects['test-project'].architect;
    appArchitect.build.options.scripts = [
      { input: 'src/string-script.js' },
      { input: 'src/zstring-script.js' },
      { input: 'src/fstring-script.js' },
      { input: 'src/ustring-script.js' },
      { input: 'src/bstring-script.js' },
      { input: 'src/astring-script.js' },
      { input: 'src/cstring-script.js' },
      { input: 'src/input-script.js' },
      { input: 'src/lazy-script.js', inject: false },
      { input: 'src/pre-rename-script.js', bundleName: 'renamed-script' },
      {
        input: 'src/pre-rename-lazy-script.js',
        bundleName: 'renamed-lazy-script',
        inject: false,
      },
    ];
  });

  await ng('build', '--extract-css', '--configuration=development');

  // files were created successfully
  await expectFileToMatch('dist/test-project/scripts.js', 'string-script');
  await expectFileToMatch('dist/test-project/scripts.js', 'input-script');
  await expectFileToMatch('dist/test-project/lazy-script.js', 'lazy-script');
  await expectFileToMatch('dist/test-project/renamed-script.js', 'pre-rename-script');
  await expectFileToMatch('dist/test-project/renamed-lazy-script.js', 'pre-rename-lazy-script');

  // index.html lists the right bundles
  await expectFileToMatch(
    'dist/test-project/index.html',
    oneLineTrim`
    <script src="runtime.js" defer></script>
    <script src="polyfills.js" defer></script>
    <script src="scripts.js" defer></script>
    <script src="renamed-script.js" defer></script>
    <script src="vendor.js" defer></script>
    <script src="main.js" defer></script>
  `,
  );
}
