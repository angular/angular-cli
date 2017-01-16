import {ng, killAllProcesses} from '../../utils/process';
import {expectToFail} from '../../utils/utils';
import {ngServe} from '../../utils/project';


export function runServeAndE2e(...args: string[]) {
  return ngServe(...args)
    .then(() => ng('e2e'))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}

export default function() {
  // This is supposed to fail without serving first...
  return expectToFail(() => ng('e2e'))
    // These should work.
    .then(() => runServeAndE2e())
    .then(() => runServeAndE2e('--prod'))
    .then(() => runServeAndE2e('--aot'))
    .then(() => runServeAndE2e('--aot', '--prod'));
}
