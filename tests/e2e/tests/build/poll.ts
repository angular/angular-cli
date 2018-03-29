import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  execAndWaitForOutputToMatch
} from '../../utils/process';
import {appendToFile} from '../../utils/fs';
import {expectToFail, wait} from '../../utils/utils';

const webpackGoodRegEx = /: Compiled successfully./;

export default function() {
  // TODO(architect): This test is behaving oddly both here and in devkit/build-angular.
  // It seems to be because of file watchers.
  return;


  // @filipesilva: This test doesn't work correctly on CircleCI while being ran by the test script.
  // Polling time seems to be ignored and several builds are fired per second.
  // Debugging showed that webpack things the `src/` directory changed on each rebuild.
  // Disabling for now.
  if (process.env['CIRCLECI']) {
    return;
  }


  return execAndWaitForOutputToMatch('ng', ['build', '--watch', '--poll=10000'], webpackGoodRegEx)
    // Wait before editing a file.
    // Editing too soon seems to trigger a rebuild and throw polling out of whack.
    .then(() => wait(3000))
    .then(() => appendToFile('projects/test-project/src/main.ts', 'console.log(1);'))
    // We have to wait poll time + rebuild build time for the regex match.
    .then(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 14000))
    .then(() => appendToFile('projects/test-project/src/main.ts', 'console.log(1);'))
    // No rebuilds should occur for a while
    .then(() => expectToFail(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 7000)))
    // But a rebuild should happen roughly within the 10 second window.
    .then(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 7000))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
