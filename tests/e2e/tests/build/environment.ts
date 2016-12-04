import { ng } from '../../utils/process';
import { expectFileToMatch } from '../../utils/fs';
import { expectGitToBeClean } from '../../utils/git';
import { expectToFail, getAppMain, isUniversalTest, getClientDist } from '../../utils/utils';


export default function () {
  // Try a prod build.
  return ng('build', '--env=prod')
    .then(() =>
      expectFileToMatch(
        `${getClientDist()}${getAppMain()}.bundle.js`,
        'production: true'
      )
    )
    .then(() => {
      if (!isUniversalTest()) {
        return;
      }

      return Promise.resolve()
        .then(() => {
          expectFileToMatch('dist/server/server.bundle.js', 'production: true');
        });
    })
    .then(() => expectGitToBeClean())

    // Build fails on invalid build target
    .then(() => expectToFail(() => ng('build', '--target=potato')))

    // This is a valid target.
    .then(() => ng('build', '--target=production'));
}
