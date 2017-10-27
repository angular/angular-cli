import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { expectToFail } from '../../utils/utils';
import { getGlobalVariable } from '../../utils/env';
import { oneLine } from 'common-tags';

export default function () {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => ng('set', 'lint.0.project', ''))
    .then(() => ng('lint', '--type-check'))
    .then(({ stdout }) => {
      if (!stdout.match(/A "project" must be specified to enable type checking./)) {
        throw new Error(oneLine`
          Expected to match "A "project" must be specified to enable type checking."
          in ${stdout}.
        `);
      }

      return stdout;
    })
    .then(() => ng('set', 'lint.0.files', '"**/baz.ts"'))
    .then(() => {
      // Starting with ng5, tsconfig.spec.json includes all ts files, so linting for it must
      // also set the files.
      if (getGlobalVariable('argv').nightly) {
        return ng('set', 'lint.1.files', '"**/baz.ts"');
      }
    })
    .then(() => writeFile('src/app/foo.ts', 'const foo = "";\n'))
    .then(() => writeFile('src/app/baz.ts', 'const baz = \'\';\n'))
    .then(() => ng('lint'))
    .then(() => ng('set', 'lint.0.files', '"**/foo.ts"'))
    .then(() => expectToFail(() => ng('lint')));
}
