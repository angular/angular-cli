import {ng} from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';
import {expectGitToBeClean} from '../../utils/git';
import {getGlobalVariable} from '../../utils/env';


export default function() {
  const ejected = getGlobalVariable('argv').eject;

  return ng('build', '--env=dev')
    .then(() => expectFileToMatch('dist/index.html', 'main.bundle.js'))
    // If this is an ejected test, the eject will create files so git will not be clean.
    .then(() => !ejected && expectGitToBeClean());
}
