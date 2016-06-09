import { request } from '../../utils/http';
import { killAllProcesses } from '../../utils/process';
import { ngServe } from '../../utils/project';
import { isUniversalTest } from '../../utils/utils';


export default function() {
  /** This test is disabled for universal */
  if (isUniversalTest()) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => ngServe('--ssl', 'true'))
    .then(() => request('https://localhost:4200/'))
    .then(body => {
      if (!body.match(/<app-root>Loading...<\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; });
}
