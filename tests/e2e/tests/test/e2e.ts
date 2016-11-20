import { ng, killAllProcesses } from '../../utils/process';
import { expectToFail, isUniversalTest } from '../../utils/utils';
import { ngServe, ngUniversalServe } from '../../utils/project';


function _runServeAndE2e(...args: string[]) {
  return ngServe(...args)
    .then(() => ng('e2e'))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}

function _runUniversalServeAndE2e(...args: string[]) {
  return ngUniversalServe(...args)
    .then(() => ng('e2e'))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}

export default function () {
  /** AOT test disabled for universal */
  if (isUniversalTest()) {
    return expectToFail(() => ng('e2e'))
      .then(() => _runUniversalServeAndE2e('--prod'));
  }
  // This is supposed to fail without serving first...
  return expectToFail(() => ng('e2e'))
  // These should work.
    .then(() => _runServeAndE2e())
    .then(() => _runServeAndE2e('--prod'))
    .then(() => _runServeAndE2e('--aot'))
    .then(() => _runServeAndE2e('--aot', '--prod'));
}
