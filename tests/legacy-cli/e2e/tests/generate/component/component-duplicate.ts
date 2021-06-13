import { oneLine } from 'common-tags';
import { appendToFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

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
    .then(() => appendToFile('src/app/test-component/test-component.component.ts', '\n// new content'))
    .then(() => expectToFail(() => ng('generate', 'component', 'test-component')));
}
