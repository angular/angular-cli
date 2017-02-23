import {
  writeMultipleFiles,
  expectFileToMatch
} from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';
import { oneLineTrim } from 'common-tags';

export default function () {
  return writeMultipleFiles({
    'src/string-style.css': '.string-style { color: red }',
    'src/input-style.css': '.input-style { color: red }',
    'src/lazy-style.css': '.lazy-style { color: red }',
    'src/pre-rename-style.css': '.pre-rename-style { color: red }',
    'src/pre-rename-lazy-style.css': '.pre-rename-lazy-style { color: red }',
    'src/common-entry-style.css': '.common-entry-style { color: red }',
    'src/common-entry-script.js': 'console.log(\'common-entry-script\');'
  })
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['styles'] = [
        'string-style.css',
        { input: 'input-style.css' },
        { input: 'lazy-style.css', lazy: true },
        { input: 'pre-rename-style.css', output: 'renamed-style' },
        { input: 'pre-rename-lazy-style.css', output: 'renamed-lazy-style', lazy: true },
        { input: 'common-entry-style.css', output: 'common-entry' }
      ];
      app['scripts'] = [{ input: 'common-entry-script.js', output: 'common-entry' }];
    }))
    .then(() => ng('build', '--extract-css'))
    // files were created successfully
    .then(() => expectFileToMatch('dist/styles.bundle.css', '.string-style'))
    .then(() => expectFileToMatch('dist/styles.bundle.css', '.input-style'))
    .then(() => expectFileToMatch('dist/lazy-style.bundle.css', '.lazy-style'))
    .then(() => expectFileToMatch('dist/renamed-style.bundle.css', '.pre-rename-style'))
    .then(() => expectFileToMatch('dist/renamed-lazy-style.bundle.css', '.pre-rename-lazy-style'))
    .then(() => expectFileToMatch('dist/common-entry.bundle.css', '.common-entry-style'))
    .then(() => expectFileToMatch('dist/common-entry.bundle.js', 'common-entry-script'))
    // index.html lists the right bundles
    .then(() => expectFileToMatch('dist/index.html', oneLineTrim`
      <link href="common-entry.bundle.css" rel="stylesheet"/>
      <link href="styles.bundle.css" rel="stylesheet"/>
      <link href="renamed-style.bundle.css" rel="stylesheet"/>
    `))
    .then(() => expectFileToMatch('dist/index.html', oneLineTrim`
      <script type="text/javascript" src="inline.bundle.js"></script>
      <script type="text/javascript" src="polyfills.bundle.js"></script>
      <script type="text/javascript" src="common-entry.bundle.js"></script>
      <script type="text/javascript" src="vendor.bundle.js"></script>
      <script type="text/javascript" src="main.bundle.js"></script>
    `));
}
