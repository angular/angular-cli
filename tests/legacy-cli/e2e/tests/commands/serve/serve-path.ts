import * as assert from 'node:assert';
import { ngServe } from '../../../utils/project';
import { loopbackAddr } from '../../../utils/env';

export default async function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  const port = await ngServe('--serve-path', 'test/');

  return Promise.resolve()
    .then(() =>
      fetch(`http://${loopbackAddr}:${port}/test`, { headers: { 'Accept': 'text/html' } }),
    )
    .then(async (response) => {
      assert.strictEqual(response.status, 200);
      assert.match(await response.text(), /<app-root><\/app-root>/);
    })
    .then(() =>
      fetch(`http://${loopbackAddr}:${port}/test/abc`, { headers: { 'Accept': 'text/html' } }),
    )
    .then(async (response) => {
      assert.strictEqual(response.status, 200);
      assert.match(await response.text(), /<app-root><\/app-root>/);
    });
}
