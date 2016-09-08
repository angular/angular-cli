import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {expectToFail} from '../../utils/utils';
import {expectGitToBeClean} from '../../utils/git';


export default function() {
  return ng('build', '-o', './build-output')
    .then(() => expectFileToExist('./build-output/index.html'))
    .then(() => expectFileToExist('./build-output/main.bundle.js'))
    .then(() => expectToFail(expectGitToBeClean));
}
