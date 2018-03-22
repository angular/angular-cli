// TODO(architect): edit the architect config instead of the cli config.

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

// tslint:disable:max-line-length
export default function () {
  return writeMultipleFiles({
    'projects/test-project/src/string-script.js': 'console.log(\'string-script\'); var number = 1+1;',
    'projects/test-project/src/zstring-script.js': 'console.log(\'zstring-script\');',
    'projects/test-project/src/fstring-script.js': 'console.log(\'fstring-script\');',
    'projects/test-project/src/ustring-script.js': 'console.log(\'ustring-script\');',
    'projects/test-project/src/bstring-script.js': 'console.log(\'bstring-script\');',
    'projects/test-project/src/astring-script.js': 'console.log(\'astring-script\');',
    'projects/test-project/src/cstring-script.js': 'console.log(\'cstring-script\');',
    'projects/test-project/src/input-script.js': 'console.log(\'input-script\');',
    'projects/test-project/src/lazy-script.js': 'console.log(\'lazy-script\');',
    'projects/test-project/src/pre-rename-script.js': 'console.log(\'pre-rename-script\');',
    'projects/test-project/src/pre-rename-lazy-script.js': 'console.log(\'pre-rename-lazy-script\');'
  })
    .then(() => appendToFile('projects/test-project/src/main.ts', 'import \'./string-script.js\';'))
    .then(() => updateJsonFile('angular.json', configJson => {
      const appArchitect = configJson.projects['test-project'].architect;
      appArchitect.build.options.scripts = [
        { input: 'projects/test-project/src/string-script.js' },
        { input: 'projects/test-project/src/zstring-script.js' },
        { input: 'projects/test-project/src/fstring-script.js' },
        { input: 'projects/test-project/src/ustring-script.js' },
        { input: 'projects/test-project/src/bstring-script.js' },
        { input: 'projects/test-project/src/astring-script.js' },
        { input: 'projects/test-project/src/cstring-script.js' },
        { input: 'projects/test-project/src/input-script.js' },
        { input: 'projects/test-project/src/lazy-script.js', lazy: true },
        { input: 'projects/test-project/src/pre-rename-script.js', output: 'renamed-script' },
        { input: 'projects/test-project/src/pre-rename-lazy-script.js', output: 'renamed-lazy-script', lazy: true }
      ];
    }))
    .then(() => ng('build', '--extract-css'))
    // files were created successfully
    .then(() => expectFileToMatch('dist/test-project/scripts.js', 'string-script'))
    .then(() => expectFileToMatch('dist/test-project/scripts.js', 'input-script'))
    .then(() => expectFileToMatch('dist/test-project/lazy-script.js', 'lazy-script'))
    .then(() => expectFileToMatch('dist/test-project/renamed-script.js', 'pre-rename-script'))
    .then(() => expectFileToMatch('dist/test-project/renamed-lazy-script.js', 'pre-rename-lazy-script'))
    // index.html lists the right bundles
    .then(() => expectFileToMatch('dist/test-project/index.html', oneLineTrim`
      <script type="text/javascript" src="runtime.js"></script>
      <script type="text/javascript" src="polyfills.js"></script>
      <script type="text/javascript" src="scripts.js"></script>
      <script type="text/javascript" src="renamed-script.js"></script>
      <script type="text/javascript" src="vendor.js"></script>
      <script type="text/javascript" src="main.js"></script>
    `))
    // Ensure scripts can be separately imported from the app.
    .then(() => expectFileToMatch('dist/test-project/main.js', 'console.log(\'string-script\');'));
    // TODO(architect): disabled until --prod is added.
    // Verify uglify, sourcemaps and hashes. Lazy scripts should not get hashes.
    // .then(() => ng('build', '--prod', '--source-map'))
    // .then(() => expectFileMatchToExist('dist', /scripts\.[0-9a-f]{20}\.js/))
    // .then(fileName => expectFileToMatch(`dist/${fileName}`, 'var number=2;'))
    // .then(() => expectFileMatchToExist('dist', /scripts\.[0-9a-f]{20}\.js\.map/))
    // .then(() => expectFileMatchToExist('dist', /renamed-script\.[0-9a-f]{20}\.js/))
    // .then(() => expectFileMatchToExist('dist', /renamed-script\.[0-9a-f]{20}\.js.map/))
    // .then(() => expectFileToMatch('dist/test-project/lazy-script.js', 'lazy-script'))
    // .then(() => expectFileToMatch('dist/test-project/enamed-lazy-script.js', 'pre-rename-lazy-script'))

    // // Expect order to be preserved.
    // .then(() => {
    //   const [fileName] = fs.readdirSync('dist')
    //     .filter(name => name.match(/^scripts\..*\.js$/));

    //   const content = fs.readFileSync(path.join('dist', fileName), 'utf-8');
    //   const re = new RegExp(/['"]string-script['"].*/.source
    //                       + /['"]zstring-script['"].*/.source
    //                       + /['"]fstring-script['"].*/.source
    //                       + /['"]ustring-script['"].*/.source
    //                       + /['"]bstring-script['"].*/.source
    //                       + /['"]astring-script['"].*/.source
    //                       + /['"]cstring-script['"].*/.source
    //                       + /['"]input-script['"]/.source);
    //   if (!content.match(re)) {
    //     throw new Error('Scripts are not included in order.');
    //   }
    // });
}
