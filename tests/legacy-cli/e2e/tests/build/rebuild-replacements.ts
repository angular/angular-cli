import { appendToFile } from '../../utils/fs';
import { killAllProcesses, waitForAnyProcessOutputToMatch } from '../../utils/process';
import { ngServe } from '../../utils/project';

const webpackGoodRegEx = / Compiled successfully./;

export default async function () {
  if (process.platform.startsWith('win')) {
    return;
  }

  try {
    await ngServe('--configuration=production');

    // Should trigger a rebuild.
    await appendToFile('src/environments/environment.prod.ts', `console.log('PROD');`);
    await waitForAnyProcessOutputToMatch(webpackGoodRegEx);
  } finally {
    await killAllProcesses();
  }
}
