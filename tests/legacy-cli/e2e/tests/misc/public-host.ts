import * as os from 'os';
import fetch from 'node-fetch';
import { killAllProcesses } from '../../utils/process';
import { ngServe } from '../../utils/project';

export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  const firstLocalIp = Object.values(os.networkInterfaces())
    .flat()
    .filter((ni) => ni.family === 'IPv4' && !ni.internal)
    .map((ni) => ni.address)
    .shift();
  const publicHost = `${firstLocalIp}:4200`;
  const localAddress = `http://${publicHost}`;

  return Promise.resolve()
    .then(() => ngServe('--host=0.0.0.0', `--public-host=${publicHost}`))
    .then(() => fetch(localAddress))
    .then((response) => response.text())
    .then((body) => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses())
    .then(() => ngServe('--host=0.0.0.0', `--disable-host-check`))
    .then(() => fetch(localAddress))
    .then((response) => response.text())
    .then((body) => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })

    .then(() => killAllProcesses())
    .then(() => ngServe('--host=0.0.0.0', `--public-host=${localAddress}`))
    .then(() => fetch(localAddress))
    .then((response) => response.text())
    .then((body) => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses())
    .then(() => ngServe('--host=0.0.0.0', `--public-host=${firstLocalIp}`))
    .then(() => fetch(localAddress))
    .then((response) => response.text())
    .then((body) => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .finally(() => killAllProcesses());
}
