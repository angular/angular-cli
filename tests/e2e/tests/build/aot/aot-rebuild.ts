import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  execAndWaitForOutputToMatch,
} from '../../../utils/process';
import { appendToFile } from '../../../utils/fs';
import { getGlobalVariable } from '../../../utils/env';
import { request } from '../../../utils/http';
import { wait } from '../../../utils/utils';

const validBundleRegEx = /: Compiled successfully./;

export default function () {
  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }
  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  return execAndWaitForOutputToMatch('ng', ['serve', '--aot'], validBundleRegEx)
    // Wait before editing a file.
    // Editing too soon seems to trigger a rebuild and throw polling/watch out of whack.
    .then(() => wait(2000))
    // Check AOT templates are up to date with current code.
    .then(() => request('http://localhost:4200/main.js'))
    .then((body) => {
      if (body.match(/\$\$_E2E_GOLDEN_VALUE_1/)) {
        throw new Error('Expected golden value 1 to not be present.');
      }
    })
    .then(() => appendToFile('src/app/app.component.html', '<p> $$_E2E_GOLDEN_VALUE_1 </p>'))
    .then(() => waitForAnyProcessOutputToMatch(validBundleRegEx, 20000))
    .then(() => request('http://localhost:4200/main.js'))
    .then((body) => {
      if (!body.match(/\$\$_E2E_GOLDEN_VALUE_1/)) {
        throw new Error('Expected golden value 1.');
      }
    })
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
