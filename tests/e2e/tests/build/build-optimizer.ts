import { ng } from '../../utils/process';
import { expectFileToMatch, expectFileToExist } from '../../utils/fs';
import { expectToFail } from '../../utils/utils';


export default function () {
  return ng('build', '--aot', '--build-optimizer')
    .then(() => expectToFail(() => expectFileToExist('dist/vendor.js')))
    .then(() => expectToFail(() => expectFileToMatch('dist/main.js', /\.decorators =/)));
}
