import {ng} from '../../../utils/process';
import {getGlobalVariable} from '../../../utils/env';

const yarnRegEx = /You can `ng set --global packageManager=yarn`./;

export default function() {
  return Promise.resolve()
    .then(() => process.chdir(getGlobalVariable('tmp-root')))
    .then(() =>  ng('set', '--global', 'packageManager=default'))
    .then(() =>  ng('new', 'foo'))
    .then(({ stdout }) => {
      // Assuming yarn is installed and checking for message with yarn.
      if (!stdout.match(yarnRegEx)) {
        throw new Error('Should display message to use yarn packageManager');
      }
    });
}
