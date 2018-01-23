import { request } from '../../utils/http';
import { killAllProcesses } from '../../utils/process';
import { ngServe } from '../../utils/project';


export default function() {
  // TODO(architect): reenable, validate, then delete this test. It is now in devkit/build-webpack.
  return;

  return Promise.resolve()
    .then(() => ngServe('--ssl', 'true'))
    .then(() => request('https://localhost:4200/'))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; });
}
