import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {expectToFail} from '../../utils/utils';


export default function() {
  return ng('build')
    .then(() => expectFileToExist('dist/vendor.js'))
    .then(() => ng('build', '--no-vendor-chunk'))
    .then(() => expectToFail(() => expectFileToExist('dist/vendor.js')));
}
