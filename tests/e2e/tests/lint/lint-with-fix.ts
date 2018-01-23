import { ng } from '../../utils/process';
import { readFile, writeFile } from '../../utils/fs';

export default function () {
  // TODO(architect): reenable, validate, then delete this test. It is now in devkit/build-webpack.
  return;

  const fileName = 'src/app/foo.ts';

  return Promise.resolve()
    .then(() => writeFile(fileName, 'const foo = "";\n'))
    .then(() => ng('lint', '--fix', '--force'))
    .then(() => readFile(fileName))
    .then(content => {
      if (!content.match(/const foo = '';/)) {
        throw new Error(`Expected to match "const foo = '';" in ${content}.`);
      }
    });
}
