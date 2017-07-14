import {
  killAllProcesses,
  exec,
  waitForAnyProcessOutputToMatch,
  execAndWaitForOutputToMatch
} from '../../utils/process';
import {appendToFile} from '../../utils/fs';
import {getGlobalVariable} from '../../utils/env';

const webpackGoodRegEx = /webpack: bundle is now VALID|webpack: Compiled successfully./;

export default function() {
  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }
  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }


  return execAndWaitForOutputToMatch('ng', ['serve'], webpackGoodRegEx)
    // Should trigger a rebuild.
    .then(() => exec('touch', 'src/main.ts'))
    .then(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 10000))
    .then(() => appendToFile('src/app/app.component.css', ':host { color: blue; }'))
    .then(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 10000))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
