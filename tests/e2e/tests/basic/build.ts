import {ng} from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';

export default function() {
  return ng('build')
    .then(() => expectFileToMatch('dist/test-project/index.html', 'main.js'))
    .then(() => ng('build', '--prod'))
    .then(() => expectFileToMatch('dist/test-project/index.html', /main\.[a-zA-Z0-9]{20}\.js/));
}
