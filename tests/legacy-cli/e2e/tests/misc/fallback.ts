import { request } from '../../utils/http';
import { killAllProcesses } from '../../utils/process';
import { ngServe } from '../../utils/project';
import { updateJsonFile } from '../../utils/project';
import { moveFile } from '../../utils/fs';


export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  // should fallback to config.app[0].index (index.html by default)
  return Promise.resolve()
    .then(() => ngServe())
    .then(() => request('http://localhost:4200/'))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; })
    // should correctly fallback to a changed index
    .then(() => moveFile('src/index.html', 'src/not-index.html'))
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.index = 'src/not-index.html';
    }))
    .then(() => ngServe())
    .then(() => request('http://localhost:4200/'))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; });
}
