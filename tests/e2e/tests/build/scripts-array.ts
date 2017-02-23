import {
  writeMultipleFiles,
  expectFileToMatch,
  appendToFile
} from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { oneLineTrim } from 'common-tags';

export default function () {
  return writeMultipleFiles({
    'src/string-script.js': 'console.log(\'string-script\');',
    'src/input-script.js': 'console.log(\'input-script\');',
    'src/lazy-script.js': 'console.log(\'lazy-script\');',
    'src/pre-rename-script.js': 'console.log(\'pre-rename-script\');',
    'src/pre-rename-lazy-script.js': 'console.log(\'pre-rename-lazy-script\');',
    'src/common-entry-script.js': 'console.log(\'common-entry-script\');',
    'src/common-entry-style.css': '.common-entry-style { color: red }',
  })
    .then(() => appendToFile('src/main.ts', 'import \'./string-script.js\';'))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['scripts'] = [
        'string-script.js',
        { input: 'input-script.js' },
        { input: 'lazy-script.js', lazy: true },
        { input: 'pre-rename-script.js', output: 'renamed-script' },
        { input: 'pre-rename-lazy-script.js', output: 'renamed-lazy-script', lazy: true },
        { input: 'common-entry-script.js', output: 'common-entry' }
      ];
      app['styles'] = [{ input: 'common-entry-style.css', output: 'common-entry' }];
    }))
    .then(() => ng('build', '--extract-css'))
    // files were created successfully
    .then(() => expectFileToMatch('dist/scripts.bundle.js', 'string-script'))
    .then(() => expectFileToMatch('dist/scripts.bundle.js', 'input-script'))
    .then(() => expectFileToMatch('dist/lazy-script.bundle.js', 'lazy-script'))
    .then(() => expectFileToMatch('dist/renamed-script.bundle.js', 'pre-rename-script'))
    .then(() => expectFileToMatch('dist/renamed-lazy-script.bundle.js', 'pre-rename-lazy-script'))
    .then(() => expectFileToMatch('dist/common-entry.bundle.js', 'common-entry-script'))
    .then(() => expectFileToMatch('dist/common-entry.bundle.css', '.common-entry-style'))
    // index.html lists the right bundles
    .then(() => expectFileToMatch('dist/index.html', oneLineTrim`
      <link href="common-entry.bundle.css" rel="stylesheet"/>
    `))
    .then(() => expectFileToMatch('dist/index.html', oneLineTrim`
      <script type="text/javascript" src="inline.bundle.js"></script>
      <script type="text/javascript" src="polyfills.bundle.js"></script>
      <script type="text/javascript" src="scripts.bundle.js"></script>
      <script type="text/javascript" src="renamed-script.bundle.js"></script>
      <script type="text/javascript" src="common-entry.bundle.js"></script>
      <script type="text/javascript" src="vendor.bundle.js"></script>
      <script type="text/javascript" src="main.bundle.js"></script>
    `))
     // ensure scripts aren't using script-loader when imported from the app
    .then(() => expectFileToMatch('dist/main.bundle.js', 'console.log(\'string-script\');'));
}
