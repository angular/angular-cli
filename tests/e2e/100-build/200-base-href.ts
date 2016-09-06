import {silentNg, fileMatchesOrFail} from '../utils';


export default function() {
  return silentNg('build', '--base-href', '/myUrl')
    .then(() => fileMatchesOrFail('dist/index.html', /<base href="\/myUrl">/));
}
