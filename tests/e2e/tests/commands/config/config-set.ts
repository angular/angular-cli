import {ng} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';

export default function() {
  return Promise.resolve()
    .then(() => expectToFail(() => ng('config', 'cli.warnings.zzzz')))
    .then(() => ng('config', 'cli.warnings.typescriptMismatch' , 'false'))
    .then(() => ng('config', 'cli.warnings.typescriptMismatch'))
    .then(({ stdout }) => {
      if (!stdout.match(/false/)) {
        throw new Error(`Expected "false", received "${JSON.stringify(stdout)}".`);
      }
    });
}
