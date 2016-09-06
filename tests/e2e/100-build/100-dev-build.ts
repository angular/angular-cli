import {silentNg, fileMatchesOrFail, expectGitToBeClean} from '../utils';


export default function() {
  return silentNg('build')
    .then(() => fileMatchesOrFail('dist/index.html', 'main.bundle.js'))
    .then(() => expectGitToBeClean());
}
