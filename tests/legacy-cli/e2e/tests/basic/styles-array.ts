// TODO(architect): edit the architect config instead of the cli config.
import { oneLineTrim } from 'common-tags';
import { expectFileToMatch, writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function() {
  await writeMultipleFiles({
    'src/string-style.css': '.string-style { color: red }',
    'src/input-style.css': '.input-style { color: red }',
    'src/lazy-style.css': '.lazy-style { color: red }',
    'src/pre-rename-style.css': '.pre-rename-style { color: red }',
    'src/pre-rename-lazy-style.css': '.pre-rename-lazy-style { color: red }',
  });

  await updateJsonFile('angular.json', workspaceJson => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.build.options.styles = [
      { input: 'src/string-style.css' },
      { input: 'src/input-style.css' },
      { input: 'src/lazy-style.css', inject: false },
      { input: 'src/pre-rename-style.css', bundleName: 'renamed-style' },
      {
        input: 'src/pre-rename-lazy-style.css',
        bundleName: 'renamed-lazy-style',
        inject: false,
      },
    ];
  });

  await ng('build', '--extract-css');

  await expectFileToMatch('dist/test-project/styles.css', '.string-style');
  await expectFileToMatch('dist/test-project/styles.css', '.input-style');
  await expectFileToMatch('dist/test-project/lazy-style.css', '.lazy-style');
  await expectFileToMatch('dist/test-project/renamed-style.css', '.pre-rename-style');
  await expectFileToMatch('dist/test-project/renamed-lazy-style.css', '.pre-rename-lazy-style');
  await expectFileToMatch(
    'dist/test-project/index.html',
    oneLineTrim`
      <link rel="stylesheet" href="styles.css">
      <link rel="stylesheet" href="renamed-style.css">
    `,
  );

  if (process.env['NG_BUILD_DIFFERENTIAL_FULL']) {
    await expectFileToMatch(
      'dist/test-project/index.html',
      oneLineTrim`
        <script src="runtime-es2015.js" type="module"></script>
        <script src="polyfills-es2015.js" type="module"></script>
        <script src="runtime-es5.js" nomodule defer></script>
        <script src="polyfills-es5.js" nomodule defer></script>
        <script src="vendor-es2015.js" type="module"></script>
        <script src="main-es2015.js" type="module"></script>
        <script src="vendor-es5.js" nomodule defer></script>
        <script src="main-es5.js" nomodule defer></script>
      `,
    );
  } else {
    await expectFileToMatch(
      'dist/test-project/index.html',
      oneLineTrim`
        <script src="polyfills-es5.js" nomodule defer></script>
        <script src="polyfills-es2015.js" type="module"></script>
        <script src="runtime-es2015.js" type="module"></script>
        <script src="vendor-es2015.js" type="module"></script>
        <script src="main-es2015.js" type="module"></script>
        <script src="runtime-es5.js" nomodule defer></script>
        <script src="vendor-es5.js" nomodule defer></script>
        <script src="main-es5.js" nomodule defer></script>
      `,
    );
  }
}
