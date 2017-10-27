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
    .then(() => ng('set', 'lint.0.exclude', '"**/foo.ts"'))
    .then(() => {
      // Starting with ng5, tsconfig.spec.json includes all ts files, so linting for it must
      // also set the files.
      if (getGlobalVariable('argv').nightly) {
        return ng('set', 'lint.1.exclude', '"**/foo.ts"');
      }
    })
    .then(() => writeFile(fileName, 'const foo = "";\n'))
    .then(() => ng('lint'))
    .then(({ stdout }) => {
      if (!stdout.match(/All files pass linting\./)) {
        throw new Error(oneLine`
          Expected to match "All files pass linting."
          in ${stdout}.
        `);
      }
    });
}
