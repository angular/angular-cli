import { killAllProcesses } from '../../utils/process';
import { request } from '../../utils/http';
import { ngServe } from '../../utils/project';
import { getGlobalVariable } from '../../utils/env';

export default function () {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return Promise.resolve()
    // check when setup through command line arguments
    .then(() => ngServe('--deploy-url', '/deployurl/', '--base-href', '/deployurl/'))
    .then(() => request('http://localhost:4200'))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => request('http://localhost:4200/deployurl/'))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; });
}
