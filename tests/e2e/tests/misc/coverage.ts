import {expectFileToExist} from '../../utils/fs';
import {ng} from '../../utils/process';


export default function() {
  return ng('test', '--single-run', '--code-coverage')
    .then(() => expectFileToExist('coverage/src/app'))
    .then(() => expectFileToExist('coverage/coverage.lcov'));
}
