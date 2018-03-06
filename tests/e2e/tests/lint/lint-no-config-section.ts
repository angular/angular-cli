import { ng } from '../../utils/process';
import { oneLine } from 'common-tags';

export default function () {
  return Promise.resolve()
    .then(() => ng('config', 'lint', '[]'))
    .then(() => ng('lint'))
    .then(({ stdout }) => {
      if (!stdout.match(/No lint configuration\(s\) found\./)) {
        throw new Error(oneLine`
          Expected to match "No lint configuration(s) found."
          in ${stdout}.
        `);
      }

      return stdout;
    });
}
