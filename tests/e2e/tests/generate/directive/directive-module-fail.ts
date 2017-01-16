import {ng} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';

export default function() {
  return Promise.resolve()
    .then(() => expectToFail(() =>
      ng('generate', 'directive', 'directive-test', '--module', 'app.moduleXXX.ts')));
}
