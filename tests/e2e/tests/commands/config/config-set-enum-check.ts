import {ng} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';

export default function() {
  return Promise.resolve()
    .then(() => expectToFail(() => ng('config', 'schematics.@schematics/angular.component.aaa', 'bbb')))
    .then(() => expectToFail(() => ng(
      'config',
      'schematics.@schematics/angular.component.viewEncapsulation',
      'bbb'
    )))
    .then(() => ng('config', 'schematics.@schematics/angular.component.viewEncapsulation', '"Emulated"'));
}
