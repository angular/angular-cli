import {silentNpm, ng} from '../../utils/process';
import {updateJsonFile} from '../../utils/project';
import {expectFileToMatch} from '../../utils/fs';
import {oneLineTrim} from 'common-tags';


export default function() {
  // TODO(architect): reenable, validate, then delete this test. It is now in devkit/build-webpack.
  return;

  return Promise.resolve()
    .then(() => silentNpm('install', 'bootstrap@4.0.0-beta.3'))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['styles'].push('../node_modules/bootstrap/dist/css/bootstrap.css');
      app['scripts'].push(
        '../node_modules/bootstrap/dist/js/bootstrap.js'
      );
    }))
    .then(() => ng('build', '--extract-css'))
    .then(() => expectFileToMatch('dist/scripts.js', '* Bootstrap'))
    .then(() => expectFileToMatch('dist/styles.css', '* Bootstrap'))
    .then(() => expectFileToMatch('dist/index.html', oneLineTrim`
      <script type="text/javascript" src="runtime.js"></script>
      <script type="text/javascript" src="polyfills.js"></script>
      <script type="text/javascript" src="scripts.js"></script>
      <script type="text/javascript" src="vendor.js"></script>
      <script type="text/javascript" src="main.js"></script>
    `))
    .then(() => ng(
      'build',
      '--optimization-level', '1',
      '--extract-css',
      '--output-hashing=none'
    ))
    .then(() => expectFileToMatch('dist/scripts.js', 'jQuery'))
    .then(() => expectFileToMatch('dist/styles.css', '* Bootstrap'))
    .then(() => expectFileToMatch('dist/index.html', oneLineTrim`
      <script type="text/javascript" src="runtime.js"></script>
      <script type="text/javascript" src="polyfills.js"></script>
      <script type="text/javascript" src="scripts.js"></script>
      <script type="text/javascript" src="main.js"></script>
    `));
}
