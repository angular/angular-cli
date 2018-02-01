import { ng } from '../../utils/process';
import { expectFileToMatch, expectFileToExist } from '../../utils/fs';
import { expectToFail } from '../../utils/utils';
import { getGlobalVariable } from '../../utils/env';


export default function () {
  return ng('build', '--aot', '--build-optimizer')
    .then(() => expectToFail(() => expectFileToExist('dist/vendor.js')))
    .then(() => expectToFail(() => expectFileToMatch('dist/main.js', /\.decorators =/)))
    .then(() => {
      // Skip this part of the test in Angular 2/4.
      if (getGlobalVariable('argv').ng2 || getGlobalVariable('argv').ng4) {
        return Promise.resolve();
      }

      // Check if build optimizer is on by default in ng5 prod builds
      return Promise.resolve()
        .then(() => ng('build', '--prod'))
        .then(() => expectToFail(() => expectFileToExist('dist/vendor.js')))
        .then(() => expectToFail(() => expectFileToMatch('dist/main.js', /\.decorators =/)));
    });
}
