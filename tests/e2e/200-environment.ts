import {silentNg, fileMatchesOrFail, expectGitToBeClean, expectToFail} from './utils';


export default function() {
  // Try a prod build.
  return silentNg('build', '--env=prod')
    .then(() => fileMatchesOrFail('dist/main.bundle.js', 'production: true'))
    .then(() => expectGitToBeClean())

    // Build fails on invalid build target
    .then(() => expectToFail(() => silentNg('build', '--target=potato')))
    .then(() => expectToFail(() => silentNg('build', '--target=prod')));
}