import {silentNpm, ng} from '../../utils/process';
import {updateJsonFile} from '../../utils/project';
import {expectFileToMatch} from '../../utils/fs';
import {oneLineTrim} from 'common-tags';


export default function() {
    // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return Promise.resolve()
    .then(() => silentNpm('install', 'bootstrap@4.0.0-beta.3'))
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.styles = [
        { input: 'node_modules/bootstrap/dist/css/bootstrap.css' },
      ];
      appArchitect.build.options.scripts = [
        { input: 'node_modules/bootstrap/dist/js/bootstrap.js' },
      ];
    }))
    .then(() => ng('build', '--extract-css'))
    .then(() => expectFileToMatch('dist/test-project/scripts.js', '* Bootstrap'))
    .then(() => expectFileToMatch('dist/test-project/styles.css', '* Bootstrap'))
    .then(() => expectFileToMatch('dist/test-project/index.html', oneLineTrim`
      <script src="runtime-es2015.js" type="module"></script>
      <script src="polyfills-es2015.js" type="module"></script>
      <script src="runtime-es5.js" nomodule></script>
      <script src="polyfills-es5.js" nomodule></script>
      <script src="scripts.js"></script>
      <script src="vendor-es2015.js" type="module"></script>
      <script src="main-es2015.js" type="module"></script>
      <script src="vendor-es5.js" nomodule></script>
      <script src="main-es5.js" nomodule></script>
    `))
    .then(() => ng(
      'build',
      '--optimization',
      '--extract-css',
      '--output-hashing=none',
      '--vendor-chunk=false',
    ))
    .then(() => expectFileToMatch('dist/test-project/scripts.js', 'jQuery'))
    .then(() => expectFileToMatch('dist/test-project/styles.css', '* Bootstrap'))
    .then(() => expectFileToMatch('dist/test-project/index.html', oneLineTrim`
    <script src="runtime-es2015.js" type="module"></script>
    <script src="polyfills-es2015.js" type="module"></script>
    <script src="runtime-es5.js" nomodule></script>
    <script src="polyfills-es5.js" nomodule></script>
    <script src="scripts.js"></script>
    <script src="main-es2015.js" type="module"></script>
    <script src="main-es5.js" nomodule></script>
    `));
}
