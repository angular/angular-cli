import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default function () {
  // TODO(architect): reenable, validate, then delete this test. It is now in devkit/build-webpack.
  return;

  return Promise.resolve()
    .then(() => ng('set', 'lint.0.files', '"src/app/**/*.ts"'))
    .then(() => expectToFail(() => ng('lint')));
}
