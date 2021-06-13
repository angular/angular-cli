import { request } from '../../utils/http';
import { assetDir } from '../../utils/assets';
import { killAllProcesses } from '../../utils/process';
import { ngServe } from '../../utils/project';


export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return Promise.resolve()
    .then(() => ngServe(
      '--ssl', 'true',
      '--ssl-key', assetDir('ssl/server.key'),
      '--ssl-cert', assetDir('ssl/server.crt')
    ))
    .then(() => request('https://localhost:4200/'))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; });

}
