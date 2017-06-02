import {ng} from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';
import {getGlobalVariable} from '../../utils/env';


export default function() {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return ng('build', '--base-href', '/myUrl')
    .then(() => expectFileToMatch('dist/index.html', /<base href="\/myUrl">/));
}
