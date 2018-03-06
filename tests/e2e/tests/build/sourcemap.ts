import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {expectToFail} from '../../utils/utils';


export default function() {
  // TODO(architect): reenable, validate, then delete this test. It is now in devkit/build-webpack.
  return;

  return ng('build', '--sourcemaps')
    .then(() => expectFileToExist('dist/main.js.map'))

    .then(() => ng('build', '--no-sourcemap'))
    .then(() => expectToFail(() => expectFileToExist('dist/main.js.map')))

    .then(() => ng('build', '--prod', '--output-hashing=none'))
    .then(() => expectToFail(() => expectFileToExist('dist/main..js.map')))

    .then(() => ng('build', '--prod', '--output-hashing=none', '--sourcemap'))
    .then(() => expectFileToExist('dist/main.js.map'));
}
