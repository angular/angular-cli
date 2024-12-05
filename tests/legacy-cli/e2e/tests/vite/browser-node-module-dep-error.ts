import assert from 'node:assert';
import { execAndWaitForOutputToMatch, ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  await ng('cache', 'clean');
  await ng('cache', 'on');

  await writeFile('src/main.ts', `import '@angular-devkit/core/node';`);

  const { stderr } = await execAndWaitForOutputToMatch('ng', ['serve'], /ERROR/, {
    CI: '0',
    NO_COLOR: 'true',
  });

  assert.match(
    stderr,
    /The package "node:path" wasn't found on the file system but is built into node/,
  );
}
