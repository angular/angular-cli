import {ng} from '../../../utils/process';


export default function() {
  const depRegEx = /get\/set have been deprecated in favor of the config command\./;
  return Promise.resolve()
    .then(() => ng('get'))
    .then(({ stdout }) => {
      if (!stdout.match(depRegEx)) {
        throw new Error(`Expected deprecation warning.`);
      }
    })
    .then(() => ng('set'))
    .then(({ stdout }) => {
      if (!stdout.match(depRegEx)) {
        throw new Error(`Expected deprecation warning.`);
      }
    });
}
