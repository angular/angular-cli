import { oneLine } from 'common-tags';

import { silentNg } from '../../../utils/process';


export default function() {
  return Promise.resolve()
    .then(() => silentNg('--help'))
    .then(({ stdout }) => {
      if (stdout.match(/(easter-egg)|(ng make-this-awesome)|(ng init)/)) {
        throw new Error(oneLine`
          Expected to not match "(easter-egg)|(ng make-this-awesome)|(ng init)"
          in help output.
        `);
      }
    })
    .then(() => silentNg('--help', 'new'))
    .then(({ stdout }) => {
      if (stdout.match(/--link-cli/)) {
        throw new Error(oneLine`
          Expected to not match "--link-cli"
          in help output.
        `);
      }
    })
}
