import {oneLine} from 'common-tags';
import {join} from 'path';
import {ng, git} from '../utils/process';
import {isMobileTest} from '../utils/utils';
import {expectFileToExist, readFile, writeFile} from '../utils/fs';


export default function() {
  const tempRoot = process.cwd();
  const tsConfigPath = 'src/tsconfig.json';

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

    .then(() => readFile(tsConfigPath))
    .then(tsConfigJson => {
      // Force sourcemaps to be from the root of the filesystem.
      const tsConfig = JSON.parse(tsConfigJson);
      tsConfig['compilerOptions']['sourceRoot'] = '/';

      return writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    })
    .then(() => git('commit', '-a', '-m', 'tsconfig-e2e-update');
}