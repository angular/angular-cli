import {ng} from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';
import {getGlobalVariable} from '../../utils/env';
import {updateJsonFile} from '../../utils/project';


export default function() {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return ng('build', '--base-href', '/myUrl')
    .then(() => expectFileToMatch('dist/index.html', /<base href="\/myUrl">/))
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['baseHref'] = '/myUrl';
    }))
    .then(() => ng('build'))
    .then(() => expectFileToMatch('dist/index.html', /<base href="\/myUrl">/))
}
