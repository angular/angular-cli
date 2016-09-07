import {expectFileToExist} from '../utils/fs';
import {silentNg} from '../utils/process';


export default function() {
  return silentNg('test', '--watch=false')
    .then(() => expectFileToExist('coverage/src/app'))
    .then(() => expectFileToExist('coverage/coverage.lcov'));
}
