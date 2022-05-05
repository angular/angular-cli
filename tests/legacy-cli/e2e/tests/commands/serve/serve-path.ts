import * as assert from 'assert';
import fetch from 'node-fetch';
import { killAllProcesses } from '../../../utils/process';
import { ngServe } from '../../../utils/project';

export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return Promise.resolve()
    .then(() => ngServe('--serve-path', 'test/'))
    .then(() => fetch('http://localhost:4200/test', { headers: { 'Accept': 'text/html' } }))
    .then(async (response) => {
      assert.strictEqual(response.status, 200);
      assert.match(await response.text(), /<app-root><\/app-root>/);
    })
    .then(() => fetch('http://localhost:4200/test/abc', { headers: { 'Accept': 'text/html' } }))
    .then(async (response) => {
      assert.strictEqual(response.status, 200);
      assert.match(await response.text(), /<app-root><\/app-root>/);
    })
    .then(
      () => killAllProcesses(),
      (err) => {
        killAllProcesses();
        throw err;
      },
    );
  // .then(() => ngServe('--base-href', 'test/'))
  // .then((response) => response.text())
  // .then(() => fetch('http://localhost:4200/test', { headers: { 'Accept': 'text/html' } }))
  // .then(body => {
  //   if (!body.match(/<app-root><\/app-root>/)) {
  //     throw new Error('Response does not match expected value.');
  //   }
  // })
  // .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; });
}
