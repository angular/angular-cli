import {ng} from '../../utils/process';
import {expectFileToMatch, expectFileToExist} from '../../utils/fs';
import {expectGitToBeClean} from '../../utils/git';
import {getGlobalVariable} from '../../utils/env';
import {expectToFail} from '../../utils/utils';


export default function() {
  const ejected = getGlobalVariable('argv').eject;

  return ng('build', '--env=dev')
    .then(() => expectFileToMatch('dist/index.html', 'main.bundle.js'))
    .then(() => expectToFail(() => expectFileToExist('dist/3rdpartylicenses.txt')))
    // If this is an ejected test, the eject will create files so git will not be clean.
    .then(() => !ejected && expectGitToBeClean());
}
