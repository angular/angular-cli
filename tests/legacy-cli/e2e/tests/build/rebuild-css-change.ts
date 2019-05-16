import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  execAndWaitForOutputToMatch
} from '../../utils/process';
import {appendToFile} from '../../utils/fs';
import {getGlobalVariable} from '../../utils/env';

const webpackGoodRegEx = /: Compiled successfully./;

export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }

  return execAndWaitForOutputToMatch('ng', ['serve'], webpackGoodRegEx)
    // Should trigger a rebuild.
    .then(() => appendToFile('src/app/app.component.css', ':host { color: blue; }'))
    .then(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 10000))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
