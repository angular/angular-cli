import * as os from 'os';
import * as _ from 'lodash';

import { request } from '../../utils/http';
import { killAllProcesses } from '../../utils/process';
import { ngServe } from '../../utils/project';

export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  const firstLocalIp = _(os.networkInterfaces())
    .values()
    .flatten()
    .filter({ family: 'IPv4', internal: false })
    .map('address')
    .first();
  const publicHost = `${firstLocalIp}:4200`;
  const localAddress = `http://${publicHost}`;

  return Promise.resolve()
    // Disabling this test. Webpack Dev Server does not check the hots anymore when binding to
    // numeric IP addresses.
    // .then(() => ngServe('--host=0.0.0.0'))
    // .then(() => request(localAddress))
    // .then(body => {
    //   if (!body.match(/Invalid Host header/)) {
    //     throw new Error('Response does not match expected value.');
    //   }
    // })
    // .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; })
    .then(() => ngServe('--host=0.0.0.0', `--public-host=${publicHost}`))
    .then(() => request(localAddress))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; })
    .then(() => ngServe('--host=0.0.0.0', `--disable-host-check`))
    .then(() => request(localAddress))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; })
    .then(() => ngServe('--host=0.0.0.0', `--public-host=${localAddress}`))
    .then(() => request(localAddress))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; })
    .then(() => ngServe('--host=0.0.0.0', `--public-host=${firstLocalIp}`))
    .then(() => request(localAddress))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; });
}
