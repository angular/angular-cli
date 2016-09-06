import {silentNg} from '../utils/process';
import {expectFileToMatch} from '../utils/fs';
import {expectGitToBeClean} from '../utils/git';


export default function() {
  return silentNg('build')
    .then(() => expectFileToMatch('dist/index.html', 'main.bundle.js'))
    .then(() => expectGitToBeClean());
}
