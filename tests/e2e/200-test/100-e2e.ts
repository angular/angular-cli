import {ng, expectToFail, wait, killAllProcesses} from '../utils';


function _runServeAndE2e(...args: string[]) {
  const promise = ng('serve', ...args);
  return wait(5000)
    .then(() => ng('e2e'))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    })
    .then(promise);
}

export default function() {
  // This is supposed to fail with serving first...
  return expectToFail(() => ng('e2e'))
    // These should work.
    .then(() => _runServeAndE2e())
    .then(() => _runServeAndE2e('--prod'));
}
