import {join} from 'path';
import {isMobileTest} from '../../utils/utils';
import {expectFileToExist, expectFileToMatch} from '../../utils/fs';
import {ng} from '../../utils/process';
import {expectGitToBeClean} from '../../utils/git';



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


export default function() {
  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  return ng('build', '--prod')
    .then(() => expectFileToExist(join(process.cwd(), 'dist')))
    // Check for cache busting hash script src
    .then(() => expectFileToMatch('dist/index.html', /main\.[0-9a-f]{20}\.bundle\.js/))

    // Check that the process didn't change local files.
    .then(() => expectGitToBeClean())
    .then(() => mobileOnlyChecks());
}
