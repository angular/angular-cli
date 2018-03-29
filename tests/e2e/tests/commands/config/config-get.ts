import {ng} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';


export default function() {
  return Promise.resolve()
    .then(() => expectToFail(() => ng('config', 'schematics.@schematics/angular.component.inlineStyle')))
    .then(() => ng('config', 'schematics.@schematics/angular.component.inlineStyle', 'false'))
    .then(() => ng('config', 'schematics.@schematics/angular.component.inlineStyle'))
    .then(({ stdout }) => {
      if (!stdout.match(/false\n?/)) {
        throw new Error(`Expected "false", received "${JSON.stringify(stdout)}".`);
      }
    })
    .then(() => expectToFail(() => {
      return ng('config', 'schematics.@schematics/angular.component.inlineStyle', 'INVALID_BOOLEAN');
    }))
    .then(() => ng('config', 'schematics.@schematics/angular.component.inlineStyle', 'true'))
    .then(() => ng('config', 'schematics.@schematics/angular.component.inlineStyle'))
    .then(({ stdout }) => {
      if (!stdout.match(/true\n?/)) {
        throw new Error(`Expected "true", received "${JSON.stringify(stdout)}".`);
      }
    })
    .then(() => ng('config', 'schematics.@schematics/angular.component.inlineStyle', 'false'));
}
