import {writeFile, expectFileToExist, expectFileToMatch} from '../utils/fs';
import {gitClean} from '../utils/git';
import {silentNg} from '../utils/process';
import {expectToFail} from '../utils/utils';


export default function() {
  return writeFile('src/assets/.file', '')
    .then(() => writeFile('src/assets/test.abc', 'hello world'))
    .then(() => silentNg('build'))
    .then(() => expectFileToExist('dist/assets/.file'))
    .then(() => expectFileToMatch('dist/assets/test.abc', 'hello world'))
    .then(() => expectToFail(() => expectFileToExist('dist/assets/.gitkeep')))
    .then(() => gitClean());
}
