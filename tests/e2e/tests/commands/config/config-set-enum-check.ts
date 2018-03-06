import {ng} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';

export default function() {
  return Promise.resolve()
    .then(() => expectToFail(() => ng('config', 'defaults.component.aaa', 'bbb')))
    .then(() => expectToFail(() => ng('config', 'defaults.component.viewEncapsulation', 'bbb')))
    .then(() => ng('config', 'defaults.component.viewEncapsulation', 'Emulated'));
}
