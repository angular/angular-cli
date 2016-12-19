import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {expectToFail, getClientDist} from '../../utils/utils';


export default function() {
  return ng('build')
    .then(() => expectFileToExist(`${getClientDist()}vendor.bundle.js`))
    .then(() => ng('build', '--no-vendor-chunk'))
    .then(() => expectToFail(() => expectFileToExist(`${getClientDist()}vendor.bundle.js`)));
}
