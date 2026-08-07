import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, readFile, writeFile } from '../../utils/fs';
import { execAndWaitForOutputToMatch, waitForAnyProcessOutputToMatch } from '../../utils/process';

const buildReadyRegEx = /Application bundle generation complete\./;

async function getOutputFiles(
  dir: string,
  predicate: (files: string[]) => boolean,
  timeout = 10_000,
): Promise<string[]> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const files = await readdir(dir);
      if (predicate(files)) {
        return files;
      }
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        throw err;
      }
    }
    await setTimeout(50);
  }

  const files = await readdir(dir);
  assert(predicate(files), `Condition not met for files in ${dir}: ${JSON.stringify(files)}`);

  return files;
}

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
  const initialOutputFiles = await getOutputFiles(
    'dist/test-project/browser',
    (files) => files.length > 0,
  );

  const originalMain = await readFile('src/main.ts');

  // Add a dynamic import to create an additional output chunk
  await Promise.all([
    waitForAnyProcessOutputToMatch(buildReadyRegEx),
    writeFile(
      'src/a.ts',
      `
  export function sayHi() {
    console.log('hi');
  }
  `,
    ),
    appendToFile('src/main.ts', `\nimport('./a').then((m) => m.sayHi());`),
  ]);
  const intermediateOutputFiles = await getOutputFiles(
    'dist/test-project/browser',
    (files) => files.length > initialOutputFiles.length,
  );
  assert(
    initialOutputFiles.length < intermediateOutputFiles.length,
    'Additional chunks should be present',
  );

  // Remove usage of dynamic import which should remove the additional output chunk
  await Promise.all([
    waitForAnyProcessOutputToMatch(buildReadyRegEx),
    writeFile('src/main.ts', originalMain),
  ]);
  const finalOutputFiles = await getOutputFiles(
    'dist/test-project/browser',
    (files) => files.length === initialOutputFiles.length,
  );
  assert.equal(
    initialOutputFiles.length,
    finalOutputFiles.length,
    'Final chunk count should be equal to initial chunk count.',
  );
}
