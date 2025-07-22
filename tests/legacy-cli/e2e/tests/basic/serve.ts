import assert from 'node:assert/strict';
import { killAllProcesses } from '../../utils/process';
import { ngServe } from '../../utils/project';

export default async function () {
  // Serve works without HMR
  const noHmrPort = await ngServe('--no-hmr');
  await verifyResponse(noHmrPort);
  await killAllProcesses();

  // Serve works with HMR
  const hmrPort = await ngServe('--hmr');
  await verifyResponse(hmrPort);
}

async function verifyResponse(port: number): Promise<void> {
  const indexResponse = await fetch(`http://localhost:${port}/`);
  assert.match(await indexResponse.text(), /<app-root><\/app-root>/);

  const assetResponse = await fetch(`http://localhost:${port}/favicon.ico`);
  assert(assetResponse.ok, 'Expected favicon asset to be available.');
}
