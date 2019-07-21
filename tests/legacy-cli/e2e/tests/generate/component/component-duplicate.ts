import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';
import { oneLine } from 'common-tags';

export default function () {
  return ng('generate', 'component', 'test-component')
    .then((output) => {
      if (!output.stdout.match(/UPDATE src[\\|\/]app[\\|\/]app.module.ts/)) {
        throw new Error(oneLine`
          Expected to match
          "UPDATE src/app.module.ts"
          in ${output.stdout}.`);
      }
    })
    .then(() => expectToFail(() => ng('generate', 'component', 'test-component')));
}
