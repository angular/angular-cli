import { request } from '../../utils/http';
import { killAllProcesses } from '../../utils/process';
import { ngServe } from '../../utils/project';

export default async function () {
  try {
    // Serve works without HMR
    await ngServe('--no-hmr');
    await verifyResponse();
    killAllProcesses();

    // Serve works with HMR
    await ngServe('--hmr');
    await verifyResponse();
  } finally {
    killAllProcesses();
  }
}

async function verifyResponse(): Promise<void> {
  const response = await request('http://localhost:4200/');

  if (!/<app-root><\/app-root>/.test(response)) {
    throw new Error('Response does not match expected value.');
  }
}
