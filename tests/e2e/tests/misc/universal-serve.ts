import { request } from '../../utils/http';
import { killAllProcesses } from '../../utils/process';
import { ngUniversalServe } from '../../utils/project';
import { isUniversalTest } from '../../utils/utils';


export default function () {
  if (!isUniversalTest()) {
    return Promise.resolve();
  }
  return Promise.resolve()
    .then(() => ngUniversalServe())
    .then(() => request('http://localhost:4200'))
    .then(body => {
      if (!body.match(/app works!/)) {
        throw new Error('Response does not match expected value.');
      }
    })
    .then(() => killAllProcesses(), (err) => {
      killAllProcesses();
      throw err;
    });
}
