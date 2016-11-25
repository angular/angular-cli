import {ng} from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';
import {updateJsonFile} from '../../utils/project';


export default function() {
  return ng('build', '-p', 'publicPath/')
    .then(() => expectFileToMatch('dist/index.html', 'publicPath/main.bundle.js'))
    .then(() => updateJsonFile('angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['publicPath'] = 'config-publicPath/';
    }))
    .then(() => ng('build'))
    .then(() => expectFileToMatch('dist/index.html', 'config-publicPath/main.bundle.js'));
}
