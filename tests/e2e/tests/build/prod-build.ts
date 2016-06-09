import { join } from 'path';
import { isMobileTest, isUniversalTest } from '../../utils/utils';
import { expectFileToExist, expectFileToMatch, expectFileToNotMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectGitToBeClean } from '../../utils/git';


function mobileOnlyChecks() {
  if (!isMobileTest()) {
    return;
  }

  // Check for mobile-specific features in prod builds.
  return Promise.resolve()
    // Service Worker
    .then(() => expectFileToExist('dist/sw.js'))
    .then(() => expectFileToMatch('dist/index.html', /sw-install\.[0-9a-f]{20}\.bundle\.js/))

    // App Manifest
    .then(() => expectFileToExist('dist/manifest.webapp'))
    .then(() => expectFileToMatch('dist/index.html',
      '<link rel="manifest" href="/manifest.webapp">'))

    // Icons folder
    .then(() => expectFileToExist('dist/icons'));
}

export default function () {
  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  return ng('build', '--prod')
    .then(() => expectFileToExist(join(process.cwd(), 'dist')))
    // Check for cache busting hash script src
    .then(() => expectFileToMatch('dist/index.html', /(main|client)\.[0-9a-f]{20}\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /styles\.[0-9a-f]{32}\.bundle\.css/))

    // Check that the process didn't change local files.
    .then(() => expectGitToBeClean())
    .then(() => mobileOnlyChecks())
    .then(() => {
      if (!isUniversalTest()) {
        return;
      }

      return Promise.resolve()
        .then(() => expectFileToExist('dist/server.bundle.js'))
        .then(() => {
          expectFileToNotMatch(
            'dist/index.html',
            '<script src="http://localhost:35729/livereload.js?snipver=1"></script>'
          );
        });
    });
}
