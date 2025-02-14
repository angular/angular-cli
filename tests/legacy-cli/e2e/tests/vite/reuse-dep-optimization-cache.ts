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
  await execAndWaitForOutputToMatch(
    'ng',
    ['serve', '--port', `${port}`],
    /Application bundle generation complete/,
    // Use CI:0 to force caching
    { DEBUG: 'vite:deps', CI: '0', NO_COLOR: 'true' },
  );

  const [, response] = await Promise.all([
    waitForAnyProcessOutputToMatch(/dependencies optimized/, 10_000),
    fetch(`http://localhost:${port}/main.js`),
  ]);

  assert(response.ok, `Expected 'response.ok' to be 'true'.`);

  // Terminate the dev-server
  await killAllProcesses();

  await execAndWaitForOutputToMatch(
    'ng',
    ['serve', '--port=0'],
    /Hash is consistent\. Skipping/,
    // Use CI:0 to force caching
    { DEBUG: 'vite:deps', CI: '0', NO_COLOR: 'true' },
  );
}
