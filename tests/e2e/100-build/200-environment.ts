import {silentNg, fileMatchesOrFail, expectGitToBeClean, expectToFail, ng} from '../utils';


export default function() {
  // Try a prod build.
  return silentNg('build', '--env=prod')
    .then(() => fileMatchesOrFail('dist/main.bundle.js', 'production: true'))
    .then(() => expectGitToBeClean())

    // Build fails on invalid build target
    .then(() => expectToFail(() => ng('build', '--target=potato')))

    // This is a valid target.
    .then(() => silentNg('build', '--target=production'));
}
