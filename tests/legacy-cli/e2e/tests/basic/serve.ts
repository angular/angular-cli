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

  if (!/<app-root><\/app-root>/.test(await indexResponse.text())) {
    throw new Error('Response does not match expected value.');
  }

  const assetResponse = await fetch(`http://localhost:${port}/favicon.ico`);

  if (!assetResponse.ok) {
    throw new Error('Expected favicon asset to be available.');
  }
}
