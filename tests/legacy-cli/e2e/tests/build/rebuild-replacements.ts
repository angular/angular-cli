import { appendToFile } from '../../utils/fs';
import {
  execAndWaitForOutputToMatch,
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
} from '../../utils/process';
import { wait } from '../../utils/utils';

const webpackGoodRegEx = / Compiled successfully./;

export default async function () {
  if (process.platform.startsWith('win')) {
    return;
  }

  try {
    await execAndWaitForOutputToMatch(
      'ng',
      ['serve', '--configuration=production'],
      webpackGoodRegEx,
    );

    await wait(4000);

    // Should trigger a rebuild.
    await appendToFile('src/environments/environment.prod.ts', `console.log('PROD');`);
    await waitForAnyProcessOutputToMatch(webpackGoodRegEx, 45000);
  } finally {
    await killAllProcesses();
  }
}
