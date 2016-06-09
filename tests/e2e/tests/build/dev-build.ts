import { ng } from '../../utils/process';
import { expectFileToMatch, expectFileToExist } from '../../utils/fs';
import { expectGitToBeClean } from '../../utils/git';
import { getAppMain, isUniversalTest } from '../../utils/utils';


export default function () {
  return ng('build', '--env=dev')
    .then(() => expectFileToMatch('dist/index.html', getAppMain() + '.bundle.js'))
    .then(() => expectGitToBeClean())
    .then(() => {
      if (!isUniversalTest()) {
        return;
      }

      return Promise.resolve()
        .then(() => expectFileToExist('dist/server.bundle.js'))
        .then(() => expectFileToMatch(
          'dist/index.html',
          'livereload.js')
        );
    });
}
