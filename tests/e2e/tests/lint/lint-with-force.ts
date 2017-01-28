import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { oneLine } from 'common-tags';

export default function () {
  const fileName = 'src/app/foo.ts';

  return Promise.resolve()
    .then(() => writeFile(fileName, 'const foo = "";\n'))
    .then(() => ng('lint', '--force'))
    .then((output) => {
      if (!output.match(/" should be '/)) {
        throw new Error(`Expected to match "" should be '" in ${output}.`);
      }

      return output;
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
