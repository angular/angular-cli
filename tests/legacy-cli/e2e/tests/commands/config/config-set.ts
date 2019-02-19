import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default function() {
  return Promise.resolve()
    .then(() => expectToFail(() => ng('config', 'cli.warnings.zzzz')))
    .then(() => ng('config', 'cli.warnings.versionMismatch' , 'false'))
    .then(() => ng('config', 'cli.warnings.versionMismatch'))
    .then(({ stdout }) => {
      if (!stdout.match(/false/)) {
        throw new Error(`Expected "false", received "${JSON.stringify(stdout)}".`);
      }
    })
    .then(() => ng('config', 'cli.packageManager' , 'yarn'))
    .then(() => ng('config', 'cli.packageManager'))
    .then(({ stdout }) => {
      if (!stdout.match(/yarn/)) {
        throw new Error(`Expected "yarn", received "${JSON.stringify(stdout)}".`);
      }
    });
}
