import {ng} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';

export default function() {
  return Promise.resolve()
    .then(() => expectToFail(() => ng('set', 'defaults.component.aaa', 'bbb')))
    .then(() => expectToFail(() => ng('set', 'defaults.component.viewEncapsulation', 'bbb')))
    .then(() => ng('set', 'defaults.component.viewEncapsulation', 'Emulated'));
}
