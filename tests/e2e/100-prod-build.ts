import {join} from 'path';

import {
  silentNg, existsOrFail, fileMatchesOrFail, isMobileTest, expectGitToBeClean
} from './utils';


function mobileOnlyChecks() {
  if (!isMobileTest()) {
    return;
  }

  // Check for mobile-specific features in prod builds.
  return Promise.resolve()
    // Service Worker
    .then(() => existsOrFail('dist/sw.js'))
    .then(() => fileMatchesOrFail('dist/index.html', /sw-install\.[0-9a-f]{20}\.bundle\.js/))

    // App Manifest
    .then(() => existsOrFail('dist/manifest.webapp'))
    .then(() => fileMatchesOrFail('dist/index.html',
                                  '<link rel="manifest" href="/manifest.webapp">'))

    // Icons folder
    .then(() => existsOrFail('dist/icons'));
}


export default function() {
  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  return silentNg('build', '--prod')
    .then(() => existsOrFail(join(process.cwd(), 'dist')))
    // Check for cache busting hash script src
    .then(() => fileMatchesOrFail('dist/index.html', /main\.[0-9a-f]{20}\.bundle\.js/))

    // Check that the process didn't change local files.
    .then(() => expectGitToBeClean())
    .then(() => mobileOnlyChecks());
}
