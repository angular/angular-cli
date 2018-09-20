import * as os from 'os';
import { join } from 'path';
import { writeFile, deleteFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';


export default function() {
  const homedir = os.homedir();
  const globalConfigPath = join(homedir, '.angular-config.json');
  return Promise.resolve()
    .then(() => writeFile(globalConfigPath, '{"version":1}'))
    .then(() => process.chdir(homedir))
    .then(() => ng('new', 'proj-name', '--dry-run'))
    .then(() => deleteFile(globalConfigPath))
    // Test that we cannot create a project inside another project.
    .then(() => writeFile(join(homedir, '.angular.json'), '{"version":1}'))
    .then(() => expectToFail(() => ng('new', 'proj-name', '--dry-run')))
    .then(() => deleteFile(join(homedir, '.angular.json')));
}
