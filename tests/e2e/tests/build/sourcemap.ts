import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {expectToFail} from '../../utils/utils';


export default function() {
  return ng('build', '--sourcemaps')
    .then(() => expectFileToExist('dist/main.js.map'))

    .then(() => ng('build', '--no-sourcemap'))
    .then(() => expectToFail(() => expectFileToExist('dist/main.js.map')))

    .then(() => ng('build', '--prod', '--output-hashing=none'))
    .then(() => expectToFail(() => expectFileToExist('dist/main..js.map')))

    .then(() => ng('build', '--prod', '--output-hashing=none', '--sourcemap'))
    .then(() => expectFileToExist('dist/main.js.map'));
}
