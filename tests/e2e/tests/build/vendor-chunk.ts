import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';


export default function() {
  return ng('build')
    .then(() => expectFileToExist('__DIST__/apps/myapp/bundles/vendor.bundle.js'));
}
