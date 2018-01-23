import { ng } from '../../utils/process';
import { expectFileToMatch, expectFileToExist } from '../../utils/fs';
import { expectToFail } from '../../utils/utils';


export default function () {
  // TODO(architect): reenable, validate, then delete this test. It is now in devkit/build-webpack.
  return;

  return ng('build', '--aot', '--build-optimizer')
    .then(() => expectToFail(() => expectFileToMatch('dist/main.js', /\.decorators =/)))
    .then(() => ng('build', '--optimization-level', '1'))
    .then(() => expectToFail(() => expectFileToExist('dist/vendor.js')))
    .then(() => expectToFail(() => expectFileToMatch('dist/main.js', /\.decorators =/)));
}
