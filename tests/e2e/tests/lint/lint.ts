import { ng } from '../../utils/process';
import { oneLine } from 'common-tags';

export default function () {
  return ng('lint')
    .then((output) => {
      if (!output.match(/All files pass linting\./)) {
        throw new Error(oneLine`
          Expected to match "All files pass linting."
          in ${output}.
        `);
      }
    });
}
