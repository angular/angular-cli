import * as path from 'path';

import {ng, silentNpm, exec} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';
import {expectGitToBeClean} from '../../../utils/git';


export default function() {
  return ng('eject')
    .then(() => expectToFail(() => ng('build')))
    .then(() => expectToFail(() => ng('test')))
    .then(() => expectToFail(() => ng('e2e')))
    .then(() => expectToFail(() => ng('serve')))
    .then(() => expectToFail(() => expectGitToBeClean()))
    .then(() => silentNpm('install'))
    .then(() => exec(path.join('node_modules', '.bin', 'webpack')));
}
