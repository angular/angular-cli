import assert from 'node:assert';
import { findFreePort } from '../../utils/network';
import {
  execAndWaitForOutputToMatch,
  killAllProcesses,
  ng,
  waitForAnyProcessOutputToMatch,
} from '../../utils/process';

export default async function () {
  await ng('cache', 'clean');
  await ng('cache', 'on');

  const port = await findFreePort();
  const serveReady = execAndWaitForOutputToMatch(
    'ng',
    ['serve', '--port', `${port}`],
    /Application bundle generation complete/,
    // Use CI:0 to force caching
    { ...process.env, DEBUG: 'vite:deps', CI: '0', NO_COLOR: 'true' },
  );

  // Note: Don't await `serveReady` before, as otherwise we might not see
  // the dependencies optimized output. There is some debouncing for `ng serve`
  // going on that could cause this.
  await Promise.all([serveReady, waitForAnyProcessOutputToMatch(/dependencies optimized/, 10_000)]);
  const response = await fetch(`http://localhost:${port}/main.js`);

  assert(response.ok, `Expected 'response.ok' to be 'true'.`);

  // Terminate the dev-server
  await killAllProcesses();

  await execAndWaitForOutputToMatch(
    'ng',
    ['serve', '--port=0'],
    /Hash is consistent\. Skipping/,
    // Use CI:0 to force caching
    { ...process.env, DEBUG: 'vite:deps', CI: '0', NO_COLOR: 'true' },
  );
}
