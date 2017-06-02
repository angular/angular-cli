import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';
import { oneLine } from 'common-tags';

export default function () {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  const fileName = 'src/app/foo.ts';

  return Promise.resolve()
    .then(() => writeFile(fileName, 'const foo = "";\n'))
    .then(() => ng('lint', '--format=stylish', '--force'))
    .then(({ stdout }) => {
      if (!stdout.match(/1:13  quotemark  " should be '/)) {
        throw new Error(oneLine`
          Expected to match "1:13  quotemark  " should be '"
          in ${stdout}.
        `);
      }
    });
}
