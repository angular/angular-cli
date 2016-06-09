import { ng, killAllProcesses } from '../../utils/process';
import { expectToFail, isUniversalTest } from '../../utils/utils';
import { ngServe } from '../../utils/project';


function _runServeAndE2e(...args: string[]) {
  return ngServe(...args)
    .then(() => ng('e2e'))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}

export default function () {
  /** Serve test disabled for universal */
  if (isUniversalTest()) {
    return expectToFail(() => ng('e2e'));
  }
  // This is supposed to fail without serving first...
  return expectToFail(() => ng('e2e'))
  // These should work.
    .then(() => _runServeAndE2e())
    .then(() => _runServeAndE2e('--prod'))
    .then(() => _runServeAndE2e('--aot'))
    .then(() => _runServeAndE2e('--aot', '--prod'));
}
