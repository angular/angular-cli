import {ng} from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';
import {expectGitToBeClean} from '../../utils/git';
import {expectToFail} from '../../utils/utils';
import {getGlobalVariable} from '../../utils/env';


export default function() {
  // Disable parts of it in webpack tests.
  const ejected = getGlobalVariable('argv').eject;

  // Try a prod build.
  return ng('build', '--env=prod')
    .then(() => expectFileToMatch('dist/main.bundle.js', 'production: true'))
    // If this is an ejected test, the eject will create files so git will not be clean.
    .then(() => !ejected && expectGitToBeClean())

    // Build fails on invalid build target
    .then(() => expectToFail(() => ng('build', '--target=potato')))

    // This is a valid target.
    .then(() => ng('build', '--target=production'));
}
