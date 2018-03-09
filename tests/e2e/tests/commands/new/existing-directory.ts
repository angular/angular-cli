import * as fs from 'fs';
import { promisify } from 'util';
import {ng} from '../../../utils/process';
import {getGlobalVariable} from '../../../utils/env';

const mkdir = promisify(fs.mkdir);


export default function() {
  return Promise.resolve()
    .then(() => process.chdir(getGlobalVariable('tmp-root')))
    .then(() => mkdir('empty-directory'))
    .then(() => ng('new', 'foo', '--directory=empty-directory', '--skip-install', '--skip-git'));
}
