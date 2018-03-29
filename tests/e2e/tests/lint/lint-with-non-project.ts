import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default function () {
  // TODO(architect): Figure out how this test should look like post devkit/build-angular.
  return;

  return Promise.resolve()
    .then(() => ng('config', 'lint.0.files', '"src/app/**/*.ts"'))
    .then(() => expectToFail(() => ng('lint', 'app')));
}
