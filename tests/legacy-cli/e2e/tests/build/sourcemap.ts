import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {expectToFail} from '../../utils/utils';


export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return ng('build', '--source-map')
    .then(() => expectFileToExist('dist/test-project/main.js.map'))

    .then(() => ng('build', '--source-map', 'false'))
    .then(() => expectToFail(() => expectFileToExist('dist/test-project/main.js.map')))

    .then(() => ng('build', '--optimization', '--output-hashing=none'))
    .then(() => expectToFail(() => expectFileToExist('dist/test-project/main..js.map')))

    .then(() => ng('build', '--optimization', '--output-hashing=none', '--source-map'))
    .then(() => expectFileToExist('dist/test-project/main.js.map'));
}
