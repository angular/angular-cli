import {ng} from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';
import {expectGitToBeClean} from '../../utils/git';


export default function() {
  return ng('build', '--env=dev')
    .then(() => expectFileToMatch('dist/index.html', 'main.bundle.js'))
    .then(() => expectGitToBeClean());
}
