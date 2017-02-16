import {ng, silentNg} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';


export default function() {
  return Promise.resolve()
    .then(() => process.chdir('/'))
    .then(() => expectToFail(() => ng('get', 'defaults.component.inlineStyle')))
    .then(() => ng('get', '--global', 'defaults.component.inlineStyle'))
    .then(({ stdout }) => {
      if (!stdout.match(/false\n?/)) {
        throw new Error(`Expected "false", received "${JSON.stringify(stdout)}".`);
      }
    })
    .then(() => expectToFail(() => {
      return ng('set', '--global', 'defaults.component.inlineStyle', 'INVALID_BOOLEAN');
    }))
    .then(() => ng('set', '--global', 'defaults.component.inlineStyle', 'true'))
    .then(() => ng('get', '--global', 'defaults.component.inlineStyle'))
    .then(({ stdout }) => {
      if (!stdout.match(/true\n?/)) {
        throw new Error(`Expected "true", received "${JSON.stringify(stdout)}".`);
      }
    })
    .then(() => ng('set', '--global', 'defaults.component.inlineStyle', 'false'));
}
