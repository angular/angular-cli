import * as path from 'path';
import { expectFileToMatch, readFile } from '../../../utils/fs';

import {ng, silentNpm, exec} from '../../../utils/process';
import {expectToFail} from '../../../utils/utils';
import {expectGitToBeClean} from '../../../utils/git';


export default function() {
  // WEBPACK4_DISABLED - eject temporarily disable for webpack 4 integration
  return;

  return ng('eject')
    .then(() => expectToFail(() => ng('build')))
    .then(() => expectToFail(() => ng('test')))
    .then(() => expectToFail(() => ng('e2e')))
    .then(() => expectToFail(() => ng('serve')))
    .then(() => expectToFail(() => expectGitToBeClean()))

    // Check that no path appears anymore.
    .then(() => expectToFail(() => expectFileToMatch('webpack.config.js', process.cwd())))

    .then(() => silentNpm('install'))
    .then(() => exec(path.join('node_modules', '.bin', 'webpack')));
}
