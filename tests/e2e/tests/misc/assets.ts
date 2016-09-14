import {writeFile, expectFileToExist, expectFileToMatch} from '../../utils/fs';
import {ng} from '../../utils/process';
import {expectToFail} from '../../utils/utils';


export default function() {
  return writeFile('src/assets/.file', '')
    .then(() => writeFile('src/assets/test.abc', 'hello world'))
    .then(() => ng('build'))
    .then(() => expectFileToExist('dist/.file'))
    .then(() => expectFileToMatch('dist/test.abc', 'hello world'))
    .then(() => expectToFail(() => expectFileToExist('dist/.gitkeep')));
}
