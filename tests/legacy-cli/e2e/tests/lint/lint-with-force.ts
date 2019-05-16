import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { oneLine } from 'common-tags';

export default function () {
  // TODO(architect): Figure out how this test should look like post devkit/build-angular.
  return;

  const fileName = 'src/app/foo.ts';

  return Promise.resolve()
    .then(() => writeFile(fileName, 'const foo = "";\n'))
    .then(() => ng('lint', 'app', '--force'))
    .then(({ stdout }) => {
      if (!stdout.match(/" should be '/)) {
        throw new Error(`Expected to match "" should be '" in ${stdout}.`);
      }

      return stdout;
    })
    .then((output) => {
      if (!output.match(/Lint errors found in the listed files\./)) {
        throw new Error(oneLine`
          Expected to match "Lint errors found in the listed files."
          in ${output}.
        `);
      }
    });
}
