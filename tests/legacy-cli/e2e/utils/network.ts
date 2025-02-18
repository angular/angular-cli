import { AddressInfo, createServer } from 'node:net';
import { isWindowsTestMode } from './wsl';

export async function findFreePort(opts?: { neverRunOnWslHost?: boolean }): Promise<number> {
  // When executing in Windows test mode, we want to find a free
  // port in the host machine where we'll e.g. launch `ng serve`.
  // The port namespace is differently reserved between the WSL VM.
  if (!opts?.neverRunOnWslHost && isWindowsTestMode()) {
    const result = await require('./process').node(__filename);
    return Number(result.stdout.trim());
  }

  return new Promise<number>((resolve, reject) => {
    const srv = createServer();
    srv.once('listening', () => {
      const port = (srv.address() as AddressInfo).port;
      srv.close((e) => (e ? reject(e) : resolve(port)));
    });
    srv.once('error', (e) => srv.close(() => reject(e)));
    srv.listen();
  });
}

// Script may be invoked directly outside of WSL environment to find
// a port available in the Windows host environment (e.g. to launch `ng serve`).
if (require.main === module) {
  findFreePort({ neverRunOnWslHost: true })
    .then((p) => console.log(p))
    .catch((e) => {
      console.error('Error:', e);
      process.exitCode = 1;
    });
}
