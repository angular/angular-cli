import { symlink } from 'fs/promises';
import { resolve } from 'path';
import { appendToFile, expectFileToMatch, writeMultipleFiles } from '../../utils/fs';
import { execAndWaitForOutputToMatch, waitForAnyProcessOutputToMatch } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { getGlobalVariable } from '../../utils/env';

const buildReadyRegEx = getGlobalVariable('argv')['esbuild']
  ? /Application bundle generation complete\./
  : /Build at: /;

export default async function () {
  // TODO: Disabled pending investigation. Steps work outside of test
  if (getGlobalVariable('argv')['esbuild']) {
    return;
  }

  await updateJsonFile('angular.json', (configJson) => {
    configJson.projects['test-project'].architect.build.options.preserveSymlinks = true;
  });

  await writeMultipleFiles({
    'src/link-source.ts': '// empty file',
    'src/main.ts': `import './link-dest';`,
  });

  await symlink(resolve('src/link-source.ts'), resolve('src/link-dest.ts'));

  await execAndWaitForOutputToMatch(
    'ng',
    ['build', '--watch', '--configuration=development'],
    buildReadyRegEx,
  );

  // Trigger a rebuild
  await Promise.all([
    waitForAnyProcessOutputToMatch(buildReadyRegEx),
    appendToFile('src/link-source.ts', `\nconsole.log('foo-bar');`),
  ]);
  await expectFileToMatch('dist/test-project/browser/main.js', `console.log('foo-bar')`);
}
