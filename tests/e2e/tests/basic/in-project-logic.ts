import {writeFile, deleteFile} from '../../utils/fs';
import {ng} from '../../utils/process';
import * as os from 'os';
import {join} from 'path';


export default function() {
  const homedir = os.homedir();
  const globalConfigPath = join(homedir, '.angular.json');
  return Promise.resolve()
    .then(() => writeFile(globalConfigPath, '{"version":1}'))
    .then(() => process.chdir(homedir))
    .then(() => ng('new', 'proj-name', '--dry-run'))
    .then(() => deleteFile(globalConfigPath));
}
