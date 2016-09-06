import {
  silentNg, expectFileToExist, silentExecOrFail, expectGitToBeClean, expectToFail
} from '../utils';


export default function() {
  return silentNg('build', '-o', './build-output')
    .then(() => expectFileToExist('./build-output/index.html'))
    .then(() => expectFileToExist('./build-output/main.bundle.js'))
    .then(() => expectToFail(expectGitToBeClean))
    .then(() => silentExecOrFail('rm', '-rf', './build-output'));
}
