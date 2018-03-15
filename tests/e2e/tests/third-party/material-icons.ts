import {silentNpm, ng} from '../../utils/process';
import {updateJsonFile} from '../../utils/project';
import {expectFileToMatch} from '../../utils/fs';


export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-webpack.

  return Promise.resolve()
    .then(() => silentNpm('install', 'material-design-icons@3.0.1'))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['styles'].push('../node_modules/material-design-icons/iconfont/material-icons.css');
    }))
    .then(() => ng('build', '--extract-css'))
    .then(() => expectFileToMatch('dist/styles.css', 'Material Icons'))
    .then(() => ng(
      'build',
      '--prod',
      '--extract-css',
      '--output-hashing=none'
    ))
    .then(() => expectFileToMatch('dist/styles.css', 'Material Icons'));
}
