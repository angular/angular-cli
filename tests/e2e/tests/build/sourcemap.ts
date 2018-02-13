import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {expectToFail} from '../../utils/utils';


export default function() {
  return ng('build', '--sourcemaps')
    .then(() => expectFileToExist('dist/main.js.map'))

    .then(() => ng('build', '--sourcemaps', 'false'))
    .then(() => expectToFail(() => expectFileToExist('dist/main.js.map')))

    .then(() => ng('build', '--target', 'production', '--output-hashing=none'))
    .then(() => expectToFail(() => expectFileToExist('dist/main..js.map')))

    .then(() => ng('build', '--target', 'production', '--output-hashing=none', '--sourcemaps'))
    .then(() => expectFileToExist('dist/main.js.map'));
}
