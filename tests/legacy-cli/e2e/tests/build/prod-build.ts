import {join} from 'path';
import {readdirSync} from 'fs';
import {expectFileToExist, expectFileToMatch} from '../../utils/fs';
import {ng} from '../../utils/process';
import {expectGitToBeClean} from '../../utils/git';
import {getGlobalVariable} from '../../utils/env';


export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  // Skip this in ejected tests.
  const ejected = getGlobalVariable('argv').eject;

  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  return ng('build', '--prod')
    .then(() => expectFileToExist(join(process.cwd(), 'dist')))
    // Check for cache busting hash script src
    .then(() => expectFileToMatch('dist/test-project/index.html', /main\.[0-9a-f]{20}\.js/))
    .then(() => expectFileToMatch('dist/test-project/index.html', /styles\.[0-9a-f]{20}\.css/))
    .then(() => expectFileToMatch('dist/test-project/3rdpartylicenses.txt', /MIT/))
    // Defaults to AoT
    .then(() => {
      const main = readdirSync('./dist/test-project').find(name => !!name.match(/main.[a-z0-9]+\.js/));
      expectFileToMatch(`dist/test-project/${main}`, /bootstrapModuleFactory\(/);
    })
    // Check that the process didn't change local files.
    .then(() => !ejected && expectGitToBeClean());
}
