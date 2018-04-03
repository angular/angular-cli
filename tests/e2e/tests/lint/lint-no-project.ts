import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { expectToFail } from '../../utils/utils';
import { oneLine } from 'common-tags';
import { updateJsonFile } from '../../utils/project';

export default function () {
  // TODO(architect): Figure out how this test should look like post devkit/build-angular.
  return;

  return Promise.resolve()
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.lint.options.tsConfig = undefined;
    }))
    .then(() => ng('lint', 'app', '--type-check'))
    .then(({ stdout }) => {
      if (!stdout.match(/A "project" must be specified to enable type checking./)) {
        throw new Error(oneLine`
          Expected to match "A "project" must be specified to enable type checking."
          in ${stdout}.
        `);
      }

      return stdout;
    })
    .then(() => ng('config', 'lint.0.files', '"**/baz.ts"'))
    .then(() => writeFile('src/app/foo.ts', 'const foo = "";\n'))
    .then(() => writeFile('src/app/baz.ts', 'const baz = \'\';\n'))
    .then(() => ng('lint', 'app'))
    .then(() => ng('config', 'lint.0.files', '"**/foo.ts"'))
    .then(() => expectToFail(() => ng('lint', 'app')));
}
