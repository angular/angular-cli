import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';


export default function () {
  return Promise.resolve()
    .then(() => updateJsonFile('tsconfig.json', configJson => {
      const compilerOptions = configJson['compilerOptions'];
      compilerOptions['target'] = 'es2015';
    }))
    .then(() => ng('build', '--prod', '--output-hashing=none'))
    // Check class constructors are present in the vendor output.
    .then(() => expectFileToMatch('dist/vendor.bundle.js', /class \w{constructor\(\){/));
}
