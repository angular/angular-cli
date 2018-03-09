import { ng } from '../../../utils/process';
import { expectToFail } from "../../../utils/utils";
import { oneLine } from 'common-tags';

export default function () {
  return ng('generate', 'component', 'test-component')
    .then((output) => {
      if (!output.stdout.match(/update src[\\|\/]app[\\|\/]app.module.ts/)) {
        throw new Error(oneLine`
          Expected to match
          "update src/app/app.module.ts"
          in ${output.stdout}.`);
      }
    })
    .then(() => expectToFail(() => ng('generate', 'component', 'test-component')));
}
