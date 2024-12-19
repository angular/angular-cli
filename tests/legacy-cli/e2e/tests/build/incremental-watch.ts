import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, readFile, writeFile } from '../../utils/fs';
import { execAndWaitForOutputToMatch, waitForAnyProcessOutputToMatch } from '../../utils/process';

const buildReadyRegEx = /Application bundle generation complete\./;

export default async function () {
  const usingApplicationBuilder = getGlobalVariable('argv')['esbuild'];
  assert(
    usingApplicationBuilder,
    'Incremental watch E2E test should not be executed with Webpack.',
  );

  // Perform an initial build in watch mode
  await execAndWaitForOutputToMatch(
    'ng',
    ['build', '--watch', '--configuration=development'],
    buildReadyRegEx,
  );
  await setTimeout(500);
  const initialOutputFiles = await readdir('dist/test-project/browser');

  const originalMain = await readFile('src/main.ts');

  // Add a dynamic import to create an additional output chunk
  await Promise.all([
    waitForAnyProcessOutputToMatch(buildReadyRegEx),
    await writeFile(
      'src/a.ts',
      `
  export function sayHi() {
    console.log('hi');
  }
  `,
    ),
    appendToFile('src/main.ts', `\nimport('./a').then((m) => m.sayHi());`),
  ]);
  await setTimeout(500);
  const intermediateOutputFiles = await readdir('dist/test-project/browser');
  assert(
    initialOutputFiles.length < intermediateOutputFiles.length,
    'Additional chunks should be present',
  );

  // Remove usage of dynamic import which should remove the additional output chunk
  await Promise.all([
    waitForAnyProcessOutputToMatch(buildReadyRegEx),
    writeFile('src/main.ts', originalMain),
  ]);
  await setTimeout(500);
  const finalOutputFiles = await readdir('dist/test-project/browser');
  assert.equal(
    initialOutputFiles.length,
    finalOutputFiles.length,
    'Final chunk count should be equal to initial chunk count.',
  );
}
