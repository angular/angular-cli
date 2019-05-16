import {
  killAllProcesses,
  exec,
  waitForAnyProcessOutputToMatch,
  execAndWaitForOutputToMatch
} from '../../utils/process';
import { expectToFail } from '../../utils/utils';


const webpackGoodRegEx = /: Compiled successfully./;

export default function () {
  // TODO(architect): This test is behaving oddly both here and in devkit/build-angular.
  // It seems to be because of file watchers.
  return;

  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }

  return execAndWaitForOutputToMatch('ng', ['serve'], webpackGoodRegEx)
    // Should trigger a rebuild.
    .then(() => exec('touch', 'src/main.ts'))
    .then(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 10000))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    })
    .then(() => execAndWaitForOutputToMatch('ng', ['serve', '--no-watch'], webpackGoodRegEx))
    // Should not trigger a rebuild when not watching files.
    .then(() => exec('touch', 'src/main.ts'))
    .then(() => expectToFail(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 10000)))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    })
}
