import {
  writeMultipleFiles,
  expectFileToMatch,
  appendToFile,
  expectFileMatchToExist
} from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { oneLineTrim } from 'common-tags';

export default function () {
  return writeMultipleFiles({
    'src/string-script.js': 'console.log(\'string-script\'); var number = 1+1;',
    'src/input-script.js': 'console.log(\'input-script\');',
    'src/lazy-script.js': 'console.log(\'lazy-script\');',
    'src/pre-rename-script.js': 'console.log(\'pre-rename-script\');',
    'src/pre-rename-lazy-script.js': 'console.log(\'pre-rename-lazy-script\');'
  })
    .then(() => appendToFile('src/main.ts', 'import \'./string-script.js\';'))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['scripts'] = [
        'string-script.js',
        { input: 'input-script.js' },
        { input: 'lazy-script.js', lazy: true },
        { input: 'pre-rename-script.js', output: 'renamed-script' },
        { input: 'pre-rename-lazy-script.js', output: 'renamed-lazy-script', lazy: true }
      ];
    }))
    .then(() => ng('build', '--extract-css'))
    // files were created successfully
    .then(() => expectFileToMatch('dist/scripts.bundle.js', 'string-script'))
    .then(() => expectFileToMatch('dist/scripts.bundle.js', 'input-script'))
    .then(() => expectFileToMatch('dist/lazy-script.bundle.js', 'lazy-script'))
    .then(() => expectFileToMatch('dist/renamed-script.bundle.js', 'pre-rename-script'))
    .then(() => expectFileToMatch('dist/renamed-lazy-script.bundle.js', 'pre-rename-lazy-script'))
    // index.html lists the right bundles
    .then(() => expectFileToMatch('dist/index.html', oneLineTrim`
      <script type="text/javascript" src="inline.bundle.js"></script>
      <script type="text/javascript" src="polyfills.bundle.js"></script>
      <script type="text/javascript" src="scripts.bundle.js"></script>
      <script type="text/javascript" src="renamed-script.bundle.js"></script>
      <script type="text/javascript" src="vendor.bundle.js"></script>
      <script type="text/javascript" src="main.bundle.js"></script>
    `))
    // Ensure scripts can be separately imported from the app.
    .then(() => expectFileToMatch('dist/main.bundle.js', 'console.log(\'string-script\');'))
    // Verify uglify, sourcemaps and hashes. Lazy scripts should not get hashes.
    .then(() => ng('build', '--prod', '--sourcemap'))
    .then(() => expectFileMatchToExist('dist', /scripts\.[0-9a-f]{20}\.bundle\.js/))
    .then(fileName => expectFileToMatch(`dist/${fileName}`, 'var number=2;'))
    .then(() => expectFileMatchToExist('dist', /scripts\.[0-9a-f]{20}\.bundle\.js\.map/))
    .then(() => expectFileMatchToExist('dist', /renamed-script\.[0-9a-f]{20}\.bundle\.js/))
    .then(() => expectFileMatchToExist('dist', /renamed-script\.[0-9a-f]{20}\.bundle\.js.map/))
    .then(() => expectFileToMatch('dist/lazy-script.bundle.js', 'lazy-script'))
    .then(() => expectFileToMatch('dist/renamed-lazy-script.bundle.js', 'pre-rename-lazy-script'));
}
