import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, readFile, writeFile } from '../../utils/fs';
import { execAndWaitForOutputToMatch, waitForAnyProcessOutputToMatch } from '../../utils/process';

const buildReadyRegEx = /Application bundle generation complete\./;

async function getOutputChunks(
  dir: string,
  predicate: (chunks: string[]) => boolean,
  timeout = 10_000,
): Promise<string[]> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const chunks = (await readdir(dir)).filter((file) => file.endsWith('.js'));
      if (predicate(chunks)) {
        return chunks;
      }
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        throw err;
      }
    }
    await setTimeout(50);
  }

  const chunks = (await readdir(dir)).filter((file) => file.endsWith('.js'));
  assert(predicate(chunks), `Condition not met for chunks in ${dir}: ${JSON.stringify(chunks)}`);

  return chunks;
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
  const initialOutputChunks = await getOutputChunks(
    'dist/test-project/browser',
    (chunks) => chunks.length > 0,
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
  const intermediateOutputChunks = await getOutputChunks(
    'dist/test-project/browser',
    (chunks) => chunks.length > initialOutputChunks.length,
  );
  assert(
    initialOutputChunks.length < intermediateOutputChunks.length,
    'Additional chunks should be present',
  );

  // Remove usage of dynamic import which should remove the additional output chunk
  await Promise.all([
    waitForAnyProcessOutputToMatch(buildReadyRegEx),
    writeFile('src/main.ts', originalMain),
  ]);
  const finalOutputChunks = await getOutputChunks(
    'dist/test-project/browser',
    (chunks) => chunks.length === initialOutputChunks.length,
  );
  assert.equal(
    initialOutputChunks.length,
    finalOutputChunks.length,
    'Final chunk count should be equal to initial chunk count.',
  );
}
