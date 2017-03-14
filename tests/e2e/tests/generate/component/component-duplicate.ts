import {testGenerate} from '../../../utils/generate';
import {oneLine} from 'common-tags';

export default function() {
  const componentName = 'dupe';
  return testGenerate({
      blueprint: 'component',
      name: componentName
    })
    .then((output) => {
      if (!output.stdout.match(/update src[\\|\/]app[\\|\/]app.module.ts/)) {
        throw new Error(oneLine`
          Expected to match
          "update src${path.sep}app${path.sep}app.module.ts"
          in ${output}.`);
      }
    })
    .then(() => testGenerate({
      blueprint: 'component',
      name: componentName,
    }))
    .then((output) => {
      if (!output.stdout.match(/identical src[\\|\/]app[\\|\/]app.module.ts/)) {
        throw new Error(oneLine`
          Expected to match
          "identical src${path.sep}app${path.sep}app.module.ts"
          in ${output}.`);
      }
    });
}
