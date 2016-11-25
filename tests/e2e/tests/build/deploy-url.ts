import {ng} from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';
import {updateJsonFile} from '../../utils/project';


export default function() {
  return ng('build', '-d', 'deployUrl/')
    .then(() => expectFileToMatch('dist/index.html', 'deployUrl/main.bundle.js'))
    .then(() => updateJsonFile('angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['deployUrl'] = 'config-deployUrl/';
    }))
    .then(() => ng('build'))
    .then(() => expectFileToMatch('dist/index.html', 'config-deployUrl/main.bundle.js'));
}
