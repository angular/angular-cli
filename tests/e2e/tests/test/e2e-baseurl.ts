import { ng, killAllProcesses } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default function () {
  return Promise.resolve()
    .then(() => ng('serve', '--port', '4400'))
    .then(() => expectToFail(() => ng('e2e')))
    .then(() => ng('e2e', '--no-serve', '--base-url=http://localhost:4400'))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
