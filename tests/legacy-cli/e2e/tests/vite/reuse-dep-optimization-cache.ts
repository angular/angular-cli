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

  // Make sure serve is consistent with build
  await execAndWaitForOutputToMatch(
    'ng',
    ['serve', '--port', `${port}`],
    /bundle generation complete/,
    // Use CI:0 to force caching
    { DEBUG: 'vite:deps', CI: '0' },
  );

  // Wait for vite to write to FS and stablize.
  await Promise.all([
    waitForAnyProcessOutputToMatch(/dependencies optimized/, 5000),
    fetch(`http://localhost:${port}/main.js`).then((r) =>
      assert(r.ok, `Expected 'response.ok' to be 'true'.`),
    ),
  ]);

  // Terminate the dev-server
  await killAllProcesses();

  // The Node.js specific module should not be found
  await execAndWaitForOutputToMatch(
    'ng',
    ['serve', '--port=0'],
    /Hash is consistent\. Skipping/,
    // Use CI:0 to force caching
    { DEBUG: 'vite:deps', CI: '0', NO_COLOR: 'true' },
  );
}
