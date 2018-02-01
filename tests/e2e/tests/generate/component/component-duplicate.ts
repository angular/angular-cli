import { ng } from '../../../utils/process';
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
    .then(() => ng('generate', 'component', 'test-component'))
    .then((output) => {
      if (!output.stdout.match(/error! src[\\|\/]app[\\|\/]test-component[\\|\/]test-component.component.ts already exists./)) {
        throw new Error(oneLine`
          Expected to match
          "ERROR! src/app/test-component/test-component.ts"
          in ${output.stdout}.`);
      }
    });
}
