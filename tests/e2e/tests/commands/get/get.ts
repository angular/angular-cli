import {ng} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';

export default function() {
  return Promise.resolve()
    .then(() => expectToFail(() => ng('get', 'apps.zzz.prefix')))
    .then(() => ng('get'))
    .then(() => ng('get', 'apps.0.prefix'))
    .then(({ stdout }) => {
      if (!stdout.match(/app/)) {
        throw new Error(`Expected "app", received "${JSON.stringify(stdout)}".`);
      }
    });
}
