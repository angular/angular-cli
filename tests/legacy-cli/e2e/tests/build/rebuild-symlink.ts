import { symlink } from 'fs/promises';
import { resolve } from 'path';
import { appendToFile, expectFileToMatch, writeMultipleFiles } from '../../utils/fs';
import { execAndWaitForOutputToMatch, waitForAnyProcessOutputToMatch } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

const buildReadyRegEx = /Build at: /;

export default async function () {
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
  await appendToFile('src/link-source.ts', `console.log('foo-bar');`);
  await waitForAnyProcessOutputToMatch(buildReadyRegEx);
  await expectFileToMatch('dist/test-project/main.js', `console.log('foo-bar')`);
}
