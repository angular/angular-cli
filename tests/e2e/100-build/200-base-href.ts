import {silentNg} from '../utils/process';
import {expectFileToMatch} from '../utils/fs';


export default function() {
  return silentNg('build', '--base-href', '/myUrl')
    .then(() => expectFileToMatch('dist/index.html', /<base href="\/myUrl">/));
}
