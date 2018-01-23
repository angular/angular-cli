import { request } from '../../utils/http';
import { killAllProcesses } from '../../utils/process';
import { ngServe } from '../../utils/project';
import { updateJsonFile } from '../../utils/project';


export default function() {
  // TODO(architect): reenable, validate, then delete this test. It is now in devkit/build-webpack.
  return;

  return Promise.resolve()
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson.defaults;
      app.serve = { port: 4201 };
    }))
    .then(() => ngServe())
    .then(() => request('http://localhost:4201/'))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; });
}
