import fetch from 'node-fetch';
import { killAllProcesses } from '../../utils/process';
import { ngServe } from '../../utils/project';

export default async function () {
  try {
    // Serve works without HMR
    await ngServe('--no-hmr');
    await verifyResponse();
    await killAllProcesses();

    // Serve works with HMR
    await ngServe('--hmr');
    await verifyResponse();
  } finally {
    await killAllProcesses();
  }
}

async function verifyResponse(): Promise<void> {
  const response = await fetch('http://localhost:4200/');

  if (!/<app-root><\/app-root>/.test(await response.text())) {
    throw new Error('Response does not match expected value.');
  }
}
