// TODO(architect): edit the architect config instead of the cli config.

import {
  writeMultipleFiles,
  expectFileToMatch
} from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { oneLineTrim } from 'common-tags';

export default function () {
  return writeMultipleFiles({
    'projects/test-project/src/string-style.css': '.string-style { color: red }',
    'projects/test-project/src/input-style.css': '.input-style { color: red }',
    'projects/test-project/src/lazy-style.css': '.lazy-style { color: red }',
    'projects/test-project/src/pre-rename-style.css': '.pre-rename-style { color: red }',
    'projects/test-project/src/pre-rename-lazy-style.css': '.pre-rename-lazy-style { color: red }'
  })
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.styles = [
        { input: 'projects/test-project/src/string-style.css' },
        { input: 'projects/test-project/src/input-style.css' },
        { input: 'projects/test-project/src/lazy-style.css', lazy: true },
        { input: 'projects/test-project/src/pre-rename-style.css', output: 'renamed-style' },
        { input: 'projects/test-project/src/pre-rename-lazy-style.css', output: 'renamed-lazy-style', lazy: true }
      ];
    }))
    .then(() => ng('build', '--extract-css'))
    // files were created successfully
    .then(() => expectFileToMatch('dist/test-project/styles.css', '.string-style'))
    .then(() => expectFileToMatch('dist/test-project/styles.css', '.input-style'))
    .then(() => expectFileToMatch('dist/test-project/lazy-style.css', '.lazy-style'))
    .then(() => expectFileToMatch('dist/test-project/renamed-style.css', '.pre-rename-style'))
    .then(() => expectFileToMatch('dist/test-project/renamed-lazy-style.css', '.pre-rename-lazy-style'))
    // index.html lists the right bundles
    .then(() => expectFileToMatch('dist/test-project/index.html', oneLineTrim`
      <link rel="stylesheet" href="styles.css">
      <link rel="stylesheet" href="renamed-style.css">
    `))
    .then(() => expectFileToMatch('dist/test-project/index.html', oneLineTrim`
      <script type="text/javascript" src="runtime.js"></script>
      <script type="text/javascript" src="polyfills.js"></script>
      <script type="text/javascript" src="vendor.js"></script>
      <script type="text/javascript" src="main.js"></script>
    `));
}
