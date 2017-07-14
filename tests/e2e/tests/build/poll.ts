import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  execAndWaitForOutputToMatch
} from '../../utils/process';
import {appendToFile} from '../../utils/fs';
import {expectToFail, wait} from '../../utils/utils';

const webpackGoodRegEx = /webpack: Compiled successfully./;

export default function() {

  // @filipesilva: This test doesn't work correctly on CircleCI while being ran by the test script.
  // Polling time seems to be ignored and several builds are fired per second.
  // Debugging showed that webpack things the `src/` directory changed on each rebuild.
  // Disabling for now.
  if (process.env['CIRCLECI']) {
    return;
  }


  return execAndWaitForOutputToMatch('ng', ['serve', '--poll=10000'], webpackGoodRegEx)
    // Wait before editing a file.
    // Editing too soon seems to trigger a rebuild and throw polling out of whack.
    .then(() => wait(2000))
    .then(() => appendToFile('src/main.ts', 'console.log(1);'))
    .then(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 12000))
    .then(() => appendToFile('src/main.ts', 'console.log(1);'))
    // No rebuilds should occur for a while
    .then(() => expectToFail(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 6000)))
    // But a rebuild should happen roughly within the 10 second window.
    .then(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 12000))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
