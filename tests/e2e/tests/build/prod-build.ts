import {join} from 'path';
import {readdirSync} from 'fs';
import {expectFileToExist, expectFileToMatch} from '../../utils/fs';
import {ng} from '../../utils/process';
import {expectGitToBeClean} from '../../utils/git';
import {getGlobalVariable} from '../../utils/env';


export default function() {
  // Skip this in ejected tests.
  const ejected = getGlobalVariable('argv').eject;

  // Can't use the `ng` helper because somewhere the environment gets
  // stuck to the first build done
  return ng('build', '--prod')
    .then(() => expectFileToExist(join(process.cwd(), 'dist')))
    // Check for cache busting hash script src
    .then(() => expectFileToMatch('dist/index.html', /main\.[0-9a-f]{20}\.bundle\.js/))
    .then(() => expectFileToMatch('dist/index.html', /styles\.[0-9a-f]{20}\.bundle\.css/))
    .then(() => expectFileToExist('dist/3rdpartylicenses.txt'))
    // Defaults to AoT
    .then(() => {
      const main = readdirSync('./dist').find(name => !!name.match(/main.[a-z0-9]+\.bundle\.js/));
      expectFileToMatch(`dist/${main}`, /bootstrapModuleFactory\(/);
    })
    // Check that the process didn't change local files.
    .then(() => !ejected && expectGitToBeClean());
}
