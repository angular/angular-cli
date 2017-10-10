import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  execAndWaitForOutputToMatch,
} from '../../utils/process';
import {replaceInFile, appendToFile} from '../../utils/fs';
import {getGlobalVariable} from '../../utils/env';


const failedRe = /webpack: Failed to compile/;
const successRe = /webpack: Compiled successfully/;

export default function() {
  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }
  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  return Promise.resolve()
    // Add an error to a non-main file.
    .then(() => appendToFile('src/app/app.component.ts', ']]]]]'))
    // Should have an error.
    .then(() => execAndWaitForOutputToMatch('ng', ['serve'], failedRe))
    // Fix the error, should trigger a rebuild.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(successRe, 20000),
      replaceInFile('src/app/app.component.ts', ']]]]]', '')
    ]))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
