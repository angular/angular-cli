import {oneLine} from 'common-tags';
import {join} from 'path';
import {ng} from '../utils/process';
import {isMobileTest} from '../utils/utils';
import {expectFileToExist} from '../utils/fs';
import {updateTsConfig, gitCommit} from '../utils/project';


export default function() {
  const tempRoot = process.cwd();

  // Setup a new project.
  return ng('new', 'test-project', '--link-cli', isMobileTest() ? '--mobile' : undefined)
    .then(() => expectFileToExist(join(process.cwd(), 'test-project')))
    .then(() => {
      process.chdir('./test-project');

      if (process.cwd() != join(tempRoot, 'test-project')) {
        throw new Error(oneLine`
          Path isn't properly set. Expected "${join(tempRoot, 'test-project')}", got
          "${process.cwd()}".
        `);
      }
    })

    // Force sourcemaps to be from the root of the filesystem.
    .then(() => updateTsConfig(json => {
      json['compilerOptions']['sourceRoot'] = '/';
    }))
   .then(() => gitCommit('tsconfig-e2e-update');
}
