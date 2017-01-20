import {join} from 'path';
import {expectFileToExist, expectFileToMatch} from '../../utils/fs';
import {ng} from '../../utils/process';
import {expectGitToBeClean} from '../../utils/git';


export default function() {
  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  return ng('build', '--prod')
    .then(() => expectFileToExist(join(process.cwd(), 'dist')))
    // Check for cache busting hash script src
    .then(() => expectFileToMatch('dist/index.html', /main\.[0-9a-f]{20}\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /styles\.[0-9a-f]{20}\.bundle\.css/))

    // Check that the process didn't change local files.
    .then(() => expectGitToBeClean());
}
