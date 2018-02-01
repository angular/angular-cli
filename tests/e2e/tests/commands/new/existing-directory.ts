import * as fs from 'fs';
import denodeify = require('denodeify');

import {ng} from '../../../utils/process';
import {getGlobalVariable} from '../../../utils/env';

const mkdir = denodeify(fs.mkdir);


export default function() {
  return Promise.resolve()
    .then(() => process.chdir(getGlobalVariable('tmp-root')))
    .then(() => mkdir('empty-directory'))
    .then(() => ng('new', 'foo', '--dir=empty-directory', '--skip-install', '--skip-git'));
}
