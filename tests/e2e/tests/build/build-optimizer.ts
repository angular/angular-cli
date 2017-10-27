import { ng } from '../../utils/process';
import { expectFileToMatch, expectFileToExist } from '../../utils/fs';
import { expectToFail } from '../../utils/utils';
import { getGlobalVariable } from '../../utils/env';


export default function () {
  return ng('build', '--aot', '--build-optimizer')
    .then(() => expectToFail(() => expectFileToExist('dist/vendor.js')))
    .then(() => expectToFail(() => expectFileToMatch('dist/main.js', /\.decorators =/)))
    .then(() => {
      // Check if build optimizer is on by default in ng5 prod builds
      // This check should be changed once ng5 because the default.
      if (!getGlobalVariable('argv').nightly) {
        return Promise.resolve();
      }

      return Promise.resolve()
        .then(() => ng('build', '--prod'))
        .then(() => expectToFail(() => expectFileToExist('dist/vendor.js')))
        .then(() => expectToFail(() => expectFileToMatch('dist/main.js', /\.decorators =/)));
    });
}
