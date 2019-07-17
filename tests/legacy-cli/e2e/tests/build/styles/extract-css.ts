import { writeMultipleFiles, expectFileToExist, expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';
import { oneLineTrim } from 'common-tags';

export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return (
    Promise.resolve()
      .then(() =>
        writeMultipleFiles({
          'src/string-style.css': '.string-style { color: red }',
          'src/input-style.css': '.input-style { color: red }',
          'src/lazy-style.css': '.lazy-style { color: red }',
          'src/pre-rename-style.css': '.pre-rename-style { color: red }',
          'src/pre-rename-lazy-style.css': '.pre-rename-lazy-style { color: red }',
        }),
      )
      .then(() =>
        updateJsonFile('angular.json', workspaceJson => {
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
        }),
      )
      .then(() => ng('build', '--extract-css'))
      // files were created successfully
      .then(() => expectFileToMatch('dist/test-project/styles.css', '.string-style'))
      .then(() => expectFileToMatch('dist/test-project/styles.css', '.input-style'))
      .then(() => expectFileToMatch('dist/test-project/lazy-style.css', '.lazy-style'))
      .then(() => expectFileToMatch('dist/test-project/renamed-style.css', '.pre-rename-style'))
      .then(() =>
        expectFileToMatch('dist/test-project/renamed-lazy-style.css', '.pre-rename-lazy-style'),
      )
      // there are no js entry points for css only bundles
      .then(() => expectToFail(() => expectFileToExist('dist/test-project/style-es5.js')))
      .then(() => expectToFail(() => expectFileToExist('dist/test-project/lazy-style-es5.js')))
      .then(() => expectToFail(() => expectFileToExist('dist/test-project/renamed-style-es5.js')))
      .then(() =>
        expectToFail(() => expectFileToExist('dist/test-project/renamed-lazy-style-es5.js')),
      )
      .then(() => expectToFail(() => expectFileToExist('dist/test-project/style-es2015.js')))
      .then(() => expectToFail(() => expectFileToExist('dist/test-project/lazy-style-es2015.js')))
      .then(() =>
        expectToFail(() => expectFileToExist('dist/test-project/renamed-style-es2015.js')),
      )
      .then(() =>
        expectToFail(() => expectFileToExist('dist/test-project/renamed-lazy-style-es2015.js')),
      )
      // index.html lists the right bundles
      .then(() =>
        expectFileToMatch(
          'dist/test-project/index.html',
          new RegExp(oneLineTrim`
      <link rel="stylesheet" href="styles\.css"/?>
      <link rel="stylesheet" href="renamed-style\.css"/?>
    `),
        ),
      )
      .then(() => expectToFail(() => expectFileToMatch(
        'dist/test-project/index.html',
        oneLineTrim`
          <script src="styles-es2015.js" type="module"></script>
          <script src="styles-es5.js" nomodule defer></script>
          <script src="renamed-style-es2015.js" type="module"></script>
          <script src="renamed-style-es5.js" nomodule defer></script>
        `)),
      )
      // also check when css isn't extracted
      .then(() => ng('build', '--no-extract-css'))
      // files were created successfully
      .then(() => expectFileToMatch('dist/test-project/styles-es5.js', '.string-style'))
      .then(() => expectFileToMatch('dist/test-project/styles-es5.js', '.input-style'))
      .then(() => expectFileToMatch('dist/test-project/lazy-style-es5.js', '.lazy-style'))
      .then(() => expectFileToMatch('dist/test-project/renamed-style-es5.js', '.pre-rename-style'))
      .then(() =>
        expectFileToMatch('dist/test-project/renamed-lazy-style-es5.js', '.pre-rename-lazy-style'),
      )
      .then(() => expectFileToMatch('dist/test-project/styles-es2015.js', '.string-style'))
      .then(() => expectFileToMatch('dist/test-project/styles-es2015.js', '.input-style'))
      .then(() => expectFileToMatch('dist/test-project/lazy-style-es2015.js', '.lazy-style'))
      .then(() =>
        expectFileToMatch('dist/test-project/renamed-style-es2015.js', '.pre-rename-style'),
      )
      .then(() =>
        expectFileToMatch(
          'dist/test-project/renamed-lazy-style-es2015.js',
          '.pre-rename-lazy-style',
        ),
      )
      // index.html lists the right bundles
      .then(() =>
        expectFileToMatch(
          'dist/test-project/index.html',
          oneLineTrim`
            <script src="styles-es2015.js" type="module"></script>
            <script src="styles-es5.js" nomodule defer></script>
            <script src="renamed-style-es2015.js" type="module"></script>
            <script src="renamed-style-es5.js" nomodule defer></script>
          `,
        ),
      )
  );
}
