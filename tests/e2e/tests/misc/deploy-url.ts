import { killAllProcesses } from '../../utils/process';
import { request } from '../../utils/http';
import { ngServe, updateJsonFile } from '../../utils/project';
import { getGlobalVariable } from '../../utils/env';
import { writeMultipleFiles } from '../../utils/fs';

export default function () {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => writeMultipleFiles({
      'src/string-script.js': 'console.log(\'string-script\'); var number = 1+1;',
    })
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      configJson['apps'][0]['scripts'] = [
        'string-script.js',
      ];
    }))
    // check when setup through command line arguments
    .then(() => ngServe('--deploy-url', '/deployurl/', '--base-href', '/deployurl/'))
    .then(() => request('http://localhost:4200'))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value. (1)');
      }
      if (!body.match(/"\/deployurl\/scripts.bundle.js"/)) {
        throw new Error('Response does not match expected value. (2)');
      }
    })
    .then(() => request('http://localhost:4200/deployurl/'))
    .then(body => {
      if (!body.match(/<app-root><\/app-root>/)) {
        throw new Error('Response does not match expected value. (3)');
      }
    })
    .then(() => killAllProcesses(), (err) => { killAllProcesses(); throw err; });
}
