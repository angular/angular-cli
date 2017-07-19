import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default function () {
  return Promise.resolve()
    .then(() => ng('test', '--single-run', '--app=0'))
    .then(() => expectToFail(() => ng('test', '--single-run', '--app=1')));
}
