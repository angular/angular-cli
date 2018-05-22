import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default function() {
  return Promise.resolve()
    .then(() => expectToFail(() => ng('config', 'schematics.@schematics/angular.component.prefix')))
    .then(() => ng('config', 'schematics.@schematics/angular.component.prefix' , 'new-prefix'))
    .then(() => ng('config', 'schematics.@schematics/angular.component.prefix'))
    .then(({ stdout }) => {
      if (!stdout.match(/new-prefix/)) {
        throw new Error(`Expected "new-prefix", received "${JSON.stringify(stdout)}".`);
      }
    });
}
