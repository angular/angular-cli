import { request } from '../../../utils/http';
import { killAllProcesses } from '../../../utils/process';
import { ngServe } from '../../../utils/project';

export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return Promise.resolve()
    .then(() => ngServe('--serve-path', 'test/'))
    .then(() => request('http://localhost:4200/test'))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => request('http://localhost:4200/test/abc'))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; })
    // .then(() => ngServe('--base-href', 'test/'))
    // .then(() => request('http://localhost:4200/test'))
    // .then(body => {
    //   if (!body.match(/<app-root><\/app-root>/)) {
    //     throw new Error('Response does not match expected value.');
    //   }
    // })
    // .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; });
}
