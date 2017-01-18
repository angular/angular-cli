import {ng, silentNg} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';


export default function() {
  return Promise.resolve()
    .then(() => process.chdir('/'))
    .then(() => expectToFail(() => ng('get', 'defaults.inline.style')))
    .then(() => ng('get', '--global', 'defaults.inline.style'))
    .then(output => {
      if (!output.match(/false\n?/)) {
        throw new Error(`Expected "false", received "${JSON.stringify(output)}".`);
      }
    })
    .then(() => expectToFail(() => {
      return ng('set', '--global', 'defaults.inline.style', 'INVALID_BOOLEAN');
    }))
    .then(() => ng('set', '--global', 'defaults.inline.style', 'true'))
    .then(() => ng('get', '--global', 'defaults.inline.style'))
    .then(output => {
      if (!output.match(/true\n?/)) {
        throw new Error(`Expected "true", received "${JSON.stringify(output)}".`);
      }
    })
    .then(() => ng('set', '--global', 'defaults.inline.style', 'false'));
}
