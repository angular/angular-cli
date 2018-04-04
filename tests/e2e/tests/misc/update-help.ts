import { ng } from '../../utils/process';

export default function () {
  return Promise.resolve()
    .then(() => ng('update', '--help'))
    .then(({ stdout }) => {
      if (!/next/.test(stdout)) {
        throw 'Update help should contain "next" option';
      }
    });
}
