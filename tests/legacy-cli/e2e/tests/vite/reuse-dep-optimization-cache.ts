import { setTimeout } from 'node:timers/promises';
import assert from 'node:assert';
import { findFreePort } from '../../utils/network';
import { execAndWaitForOutputToMatch, killAllProcesses, ng } from '../../utils/process';

export default async function () {
  await ng('cache', 'clean');
  await ng('cache', 'on');

  try {
    const port = await findFreePort();

    // Make sure serve is consistent with build
    await execAndWaitForOutputToMatch(
      'ng',
      ['serve', '--port', `${port}`],
      /vite:deps Dependencies bundled/,
      // Use CI:0 to force caching
      { DEBUG: 'vite:deps', CI: '0' },
    );

    // Make request so that vite writes the cache.
    const response = await fetch(`http://localhost:${port}/@vite/client`);
    assert(response.ok, `Expected 'response.ok' to be 'true'.`);

    // Wait for vite to write to FS and stablize.
    await setTimeout(2_000);

    // Terminate the dev-server
    await killAllProcesses();

    // The Node.js specific module should not be found
    await execAndWaitForOutputToMatch(
      'ng',
      ['serve', '--port=0'],
      /vite:deps Hash is consistent\. Skipping/,
      // Use CI:0 to force caching
      { DEBUG: 'vite:deps', CI: '0' },
    );
  } finally {
    await killAllProcesses();
  }
}
