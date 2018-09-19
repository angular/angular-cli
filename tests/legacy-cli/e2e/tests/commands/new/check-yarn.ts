import {ng} from '../../../utils/process';
import {getGlobalVariable} from '../../../utils/env';

const yarnRegEx = /You can `ng config -g cli.packageManager yarn`./;

export default function() {
  return Promise.resolve()
    .then(() => process.chdir(getGlobalVariable('tmp-root')))
    .then(() =>  ng('config', '--global', 'packageManager', 'default'))
    .then(() =>  ng('new', 'foo', '--version=1.6.8'))
    .then(({ stdout }) => {
      // Assuming yarn is installed and checking for message with yarn.
      if (!stdout.match(yarnRegEx)) {
        throw new Error('Should display message to use yarn packageManager');
      }
    });
}
