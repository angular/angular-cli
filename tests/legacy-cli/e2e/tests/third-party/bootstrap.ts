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
      <script src="scripts.js" defer></script>
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
    <script src="scripts.js" defer></script>
    `));
}
