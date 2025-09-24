import { getGlobalVariable } from '../../utils/env';
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

  await updateJsonFile('angular.json', (configJson) => {
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

  await ng('build', '--configuration=development');

  // files were created successfully
  await expectFileToMatch('dist/test-project/browser/scripts.js', 'string-script');
  await expectFileToMatch('dist/test-project/browser/scripts.js', 'input-script');
  await expectFileToMatch('dist/test-project/browser/lazy-script.js', 'lazy-script');
  await expectFileToMatch('dist/test-project/browser/renamed-script.js', 'pre-rename-script');
  await expectFileToMatch(
    'dist/test-project/browser/renamed-lazy-script.js',
    'pre-rename-lazy-script',
  );

  // index.html lists the right bundles
  if (getGlobalVariable('argv')['esbuild']) {
    await expectFileToMatch(
      'dist/test-project/browser/index.html',
      [
        '<script src="scripts.js" defer></script>',
        '<script src="renamed-script.js" defer></script>',
        '<script src="main.js" type="module"></script>',
      ].join(''),
    );
  } else {
    await expectFileToMatch(
      'dist/test-project/browser/index.html',
      [
        '<script src="runtime.js" type="module"></script>',
        '<script src="scripts.js" defer></script>',
        '<script src="renamed-script.js" defer></script>',
        '<script src="vendor.js" type="module"></script>',
        '<script src="main.js" type="module"></script>',
      ].join(''),
    );
  }
}
