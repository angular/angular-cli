import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default function () {
  return Promise.resolve()
    .then(() => ng('config', 'lint.0.files', '"src/app/**/*.ts"'))
    .then(() => expectToFail(() => ng('lint')));
}
