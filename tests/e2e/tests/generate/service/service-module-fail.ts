import {ng} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';


export default function() {
  return Promise.resolve()
    .then(() => expectToFail(() =>
      ng('generate', 'service', 'test-service', '--module', 'app.moduleXXX.ts')));
}
