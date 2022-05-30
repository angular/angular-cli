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
    .finally(() => killAllProcesses());
}
