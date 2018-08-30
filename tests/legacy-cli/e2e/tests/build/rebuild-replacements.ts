import { getGlobalVariable } from '../../utils/env';
import { appendToFile } from '../../utils/fs';
import {
  execAndWaitForOutputToMatch,
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
} from '../../utils/process';

const webpackGoodRegEx = /: Compiled successfully./;

export default async function() {
  if (process.platform.startsWith('win')) {
    return;
  }

  let error;
  try {
    await execAndWaitForOutputToMatch('ng', ['serve', '--prod'], webpackGoodRegEx);

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
