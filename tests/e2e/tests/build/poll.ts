import { setTimeout } from 'node:timers/promises';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile } from '../../utils/fs';
import { waitForAnyProcessOutputToMatch } from '../../utils/process';
import { ngServe } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

const webpackGoodRegEx = getGlobalVariable('argv')['esbuild']
  ? /Application bundle generation complete\./
  : / Compiled successfully\./;

export default async function () {
  await ngServe('--poll=10000');

  // Wait before editing a file.
  // Editing too soon seems to trigger a rebuild and throw polling out of whack.
  await setTimeout(3000);
  await appendToFile('src/main.ts', 'console.log(1);');

  // We have to wait poll time + rebuild build time for the regex match.
  await waitForAnyProcessOutputToMatch(webpackGoodRegEx, 14000);

  // No rebuilds should occur for a while
  await appendToFile('src/main.ts', 'console.log(1);');
  await expectToFail(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 7000));

  // But a rebuild should happen roughly within the 10 second window.
  await waitForAnyProcessOutputToMatch(webpackGoodRegEx, 7000);
}
