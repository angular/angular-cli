import * as assert from 'assert';
import fetch from 'node-fetch';
import { killAllProcesses } from '../../../utils/process';
import { ngServe } from '../../../utils/project';

export default async function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  const port = await ngServe('--serve-path', 'test/');

  return Promise.resolve()
    .then(() => fetch(`http://localhost:${port}/test`, { headers: { 'Accept': 'text/html' } }))
    .then(async (response) => {
      assert.strictEqual(response.status, 200);
      assert.match(await response.text(), /<app-root><\/app-root>/);
    })
    .then(() => fetch(`http://localhost:${port}/test/abc`, { headers: { 'Accept': 'text/html' } }))
    .then(async (response) => {
      assert.strictEqual(response.status, 200);
      assert.match(await response.text(), /<app-root><\/app-root>/);
    })
    .finally(() => killAllProcesses());
}
