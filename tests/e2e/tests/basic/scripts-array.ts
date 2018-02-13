import {
  writeMultipleFiles,
  expectFileToMatch,
  appendToFile,
  expectFileMatchToExist
} from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { oneLineTrim } from 'common-tags';
import * as fs from 'fs';
import * as path from 'path';

export default function () {
  return writeMultipleFiles({
    'src/string-script.js': 'console.log(\'string-script\'); var number = 1+1;',
    'src/zstring-script.js': 'console.log(\'zstring-script\');',
    'src/fstring-script.js': 'console.log(\'fstring-script\');',
    'src/ustring-script.js': 'console.log(\'ustring-script\');',
    'src/bstring-script.js': 'console.log(\'bstring-script\');',
    'src/astring-script.js': 'console.log(\'astring-script\');',
    'src/cstring-script.js': 'console.log(\'cstring-script\');',
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
        'zstring-script.js',
        'fstring-script.js',
        'ustring-script.js',
        'bstring-script.js',
        'astring-script.js',
        'cstring-script.js',
        { input: 'input-script.js' },
        { input: 'lazy-script.js', lazy: true },
        { input: 'pre-rename-script.js', output: 'renamed-script' },
        { input: 'pre-rename-lazy-script.js', output: 'renamed-lazy-script', lazy: true }
      ];
    }))
    .then(() => ng('build', '--extract-css'))
    // files were created successfully
    .then(() => expectFileToMatch('dist/scripts.js', 'string-script'))
    .then(() => expectFileToMatch('dist/scripts.js', 'input-script'))
    .then(() => expectFileToMatch('dist/lazy-script.js', 'lazy-script'))
    .then(() => expectFileToMatch('dist/renamed-script.js', 'pre-rename-script'))
    .then(() => expectFileToMatch('dist/renamed-lazy-script.js', 'pre-rename-lazy-script'))
    // index.html lists the right bundles
    .then(() => expectFileToMatch('dist/index.html', oneLineTrim`
      <script type="text/javascript" src="runtime.js"></script>
      <script type="text/javascript" src="polyfills.js"></script>
      <script type="text/javascript" src="scripts.js"></script>
      <script type="text/javascript" src="renamed-script.js"></script>
      <script type="text/javascript" src="vendor.js"></script>
      <script type="text/javascript" src="main.js"></script>
    `))
    // Ensure scripts can be separately imported from the app.
    .then(() => expectFileToMatch('dist/main.js', 'console.log(\'string-script\');'))
    // Verify uglify, sourcemaps and hashes. Lazy scripts should not get hashes.
    .then(() => ng('build', '--target', 'production', '--sourcemaps'))
    .then(() => expectFileMatchToExist('dist', /scripts\.[0-9a-f]{20}\.js/))
    .then(fileName => expectFileToMatch(`dist/${fileName}`, 'var number=2;'))
    .then(() => expectFileMatchToExist('dist', /scripts\.[0-9a-f]{20}\.js\.map/))
    .then(() => expectFileMatchToExist('dist', /renamed-script\.[0-9a-f]{20}\.js/))
    .then(() => expectFileMatchToExist('dist', /renamed-script\.[0-9a-f]{20}\.js.map/))
    .then(() => expectFileToMatch('dist/lazy-script.js', 'lazy-script'))
    .then(() => expectFileToMatch('dist/renamed-lazy-script.js', 'pre-rename-lazy-script'))

    // Expect order to be preserved.
    .then(() => {
      const [fileName] = fs.readdirSync('dist')
        .filter(name => name.match(/^scripts\..*\.js$/));

      const content = fs.readFileSync(path.join('dist', fileName), 'utf-8');
      const re = new RegExp(/['"]string-script['"].*/.source
                          + /['"]zstring-script['"].*/.source
                          + /['"]fstring-script['"].*/.source
                          + /['"]ustring-script['"].*/.source
                          + /['"]bstring-script['"].*/.source
                          + /['"]astring-script['"].*/.source
                          + /['"]cstring-script['"].*/.source
                          + /['"]input-script['"]/.source);
      if (!content.match(re)) {
        throw new Error('Scripts are not included in order.');
      }
    });
}
