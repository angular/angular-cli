import {ng} from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';
import {expectGitToBeClean} from '../../utils/git';
import {expectToFail} from '../../utils/utils';


export default function() {
  // Try a prod build.
  return ng('build', '--env=prod')
    .then(() => expectFileToMatch('dist/main.bundle.js', 'production: true'))
    .then(() => expectGitToBeClean())

    // Build fails on invalid build target
    .then(() => expectToFail(() => ng('build', '--target=potato')))

    // This is a valid target.
    .then(() => ng('build', '--target=production'));
}
