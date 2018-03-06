import {ng} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';

export default function() {
  return Promise.resolve()
    .then(() => expectToFail(() => ng('config', 'apps.zzz.prefix')))
    .then(() => ng('config', 'apps.0.prefix' , 'new-prefix'))
    .then(() => ng('config', 'apps.0.prefix'))
    .then(({ stdout }) => {
      if (!stdout.match(/new-prefix/)) {
        throw new Error(`Expected "new-prefix", received "${JSON.stringify(stdout)}".`);
      }
    });
}
