import assert from 'node:assert';
import { setTimeout } from 'node:timers/promises';
import { findFreePort } from '../../utils/network';
import { execAndWaitForOutputToMatch, killAllProcesses, ng } from '../../utils/process';

export default async function () {
  await ng('cache', 'clean');
  await ng('cache', 'on');

  const port = await findFreePort();

  const [, response] = await Promise.all([
    execAndWaitForOutputToMatch(
      'ng',
      ['serve', '--port', `${port}`],
      /dependencies optimized/,
      // Use CI:0 to force caching
      { DEBUG: 'vite:deps', CI: '0', NO_COLOR: 'true' },
    ),
    setTimeout(4_000).then(() => fetch(`http://localhost:${port}/main.js`)),
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
