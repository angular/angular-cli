import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { oneLine } from 'common-tags';

export default function () {
  // TODO(architect): Figure out how this test should look like post devkit/build-angular.
  return;

  const fileName = 'src/app/foo.ts';

  return Promise.resolve()
    .then(() => ng('config', 'lint.0.exclude', '"**/foo.ts"'))
    .then(() => writeFile(fileName, 'const foo = "";\n'))
    .then(() => ng('lint', 'app'))
    .then(({ stdout }) => {
      if (!stdout.match(/All files pass linting\./)) {
        throw new Error(oneLine`
          Expected to match "All files pass linting."
          in ${stdout}.
        `);
      }
    });
}
