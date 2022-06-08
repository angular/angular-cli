import * as assert from 'assert';
import fetch from 'node-fetch';
import { killAllProcesses } from '../../utils/process';
import { ngServe } from '../../utils/project';
import { updateJsonFile } from '../../utils/project';
import { moveFile } from '../../utils/fs';

export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  // should fallback to config.app[0].index (index.html by default)
  return (
    Promise.resolve()
      .then(() => ngServe())
      .then((port) => fetch(`http://localhost:${port}/`, { headers: { 'Accept': 'text/html' } }))
      .then(async (response) => {
        assert.strictEqual(response.status, 200);
        assert.match(await response.text(), /<app-root><\/app-root>/);
      })
      .finally(() => killAllProcesses())
      // should correctly fallback to a changed index
      .then(() => moveFile('src/index.html', 'src/not-index.html'))
      .then(() =>
        updateJsonFile('angular.json', (workspaceJson) => {
          const appArchitect = workspaceJson.projects['test-project'].architect;
          appArchitect.build.options.index = 'src/not-index.html';
        }),
      )
      .then(() => ngServe())
      .then((port) => fetch(`http://localhost:${port}/`, { headers: { 'Accept': 'text/html' } }))
      .then(async (response) => {
        assert.strictEqual(response.status, 200);
        assert.match(await response.text(), /<app-root><\/app-root>/);
      })
      .finally(() => killAllProcesses())
  );
}
