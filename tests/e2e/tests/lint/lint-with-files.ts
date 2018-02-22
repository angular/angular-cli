import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';

export default function () {
  const fileNameFoo = 'src/app/foo.ts';
  const fileNameBar = 'src/app/bar.ts';

  return Promise.resolve()
    .then(() => writeFile(fileNameFoo, 'const foo = \'\';\n'))
    .then(() => writeFile(fileNameBar, 'const bar = "";\n'))
    .then(() => ng('lint', 'src/app/foo.ts'))
    .then(({ stdout }) => {
      if (!stdout.match(/All files pass linting./)) {
        throw new Error('All files pass linting.');
      }
    });
}
