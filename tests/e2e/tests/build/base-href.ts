import { ng } from '../../utils/process';
import { expectFileToMatch } from '../../utils/fs';
import { getClientDist } from '../../utils/utils';


export default function () {
  return ng('build', '--base-href', '/myUrl')
    .then(() => expectFileToMatch(`${getClientDist()}index.html`, /<base href="\/myUrl">/));
}
