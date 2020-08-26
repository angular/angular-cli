import { getGlobalVariable } from '../../utils/env';
import { appendToFile } from '../../utils/fs';
import {
  execAndWaitForOutputToMatch,
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
} from '../../utils/process';
import { wait } from '../../utils/utils';

const webpackGoodRegEx = /: Compiled successfully./;

export default async function() {
  if (process.platform.startsWith('win')) {
    return;
  }

  let error;
  try {
    await execAndWaitForOutputToMatch('ng', ['serve', '--prod'], webpackGoodRegEx);

    await wait(4000);
 
    // Should trigger a rebuild.
    await appendToFile('src/environments/environment.prod.ts', `console.log('PROD');`);
    await waitForAnyProcessOutputToMatch(webpackGoodRegEx, 45000);
  } catch (e) {
    error = e;
  }

  killAllProcesses();
  if (error) {
    throw error;
  }
}
