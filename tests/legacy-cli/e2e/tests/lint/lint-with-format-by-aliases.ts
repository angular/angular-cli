import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { oneLine } from 'common-tags';

export default function () {
  // TODO(architect): Figure out how this test should look like post devkit/build-angular.
  return;

  const fileName = 'src/app/foo.ts';

  return Promise.resolve()
    .then(() => writeFile(fileName, 'const foo = "";\n'))
    .then(() => ng('lint', 'app', '-t=stylish', '--force'))
    .then(({ stdout }) => {
      if (!stdout.match(/1:13  quotemark  " should be '/)) {
        throw new Error(oneLine`
          Expected to match "1:13  quotemark  " should be '"
          in ${stdout}.
        `);
      }
    });
}
