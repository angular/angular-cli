import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {expectToFail} from '../../utils/utils';


export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-webpack.

  return ng('build', '--source-map')
    .then(() => expectFileToExist('dist/main.js.map'))

    .then(() => ng('build', '--source-map', 'false'))
    .then(() => expectToFail(() => expectFileToExist('dist/main.js.map')))

    .then(() => ng('build', '--optimization-level', '1', '--output-hashing=none'))
    .then(() => expectToFail(() => expectFileToExist('dist/main..js.map')))

    .then(() => ng('build', '--optimization-level', '1', '--output-hashing=none', '--source-map'))
    .then(() => expectFileToExist('dist/main.js.map'));
}
