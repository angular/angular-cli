import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {updateJsonFile} from '../../utils/project';
import {copyFile} from '../../utils/fs';


export default function() {
  // TODO(architect): reenable, validate, then delete this test. It is now in devkit/build-webpack.
  return;

  return Promise.resolve()
    .then(() => copyFile('src/index.html', 'src/config-index.html'))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['outDir'] = 'config-build-output';
      app['index'] = 'config-index.html';
    }))
    .then(() => ng('build'))
    .then(() => expectFileToExist('./config-build-output/config-index.html'));
}
