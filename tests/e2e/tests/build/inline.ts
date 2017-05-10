import {ng} from '../../utils/process';
import {expectFileToExist, expectFileNotToExist, expectFileToMatch} from '../../utils/fs';
import {expectToFail} from '../../utils/utils';

export default function () {
  return ng('build', '--sourcemaps', '--inline')
    .then(() => expectFileNotToExist('dist/inline.bundle.js'))
    .then(() => expectFileToExist('dist/inline.bundle.js.map'))
    .then(() => expectToFail(() => expectFileToMatch('dist/index.html', /inline\.[0-9a-f]{20}\.bundle\.js/)))

    .then(() => ng('build', '--prod', '--output-hashing=none', '--inline'))
    .then(() => expectFileNotToExist('dist/inline.bundle.js'))
    .then(() => expectToFail(() => expectFileToMatch('dist/index.html', /inline\.[0-9a-f]{20}\.bundle\.js/)))

    .then(() => ng('build', '--prod', '--output-hashing=none', '--inline', '--sourcemap'))
    .then(() => expectFileNotToExist('dist/inline.bundle.js'))
    .then(() => expectFileToExist('dist/main.bundle.js.map'))
    .then(() => expectToFail(() => expectFileToMatch('dist/index.html', /inline\.[0-9a-f]{20}\.bundle\.js/)));
}
