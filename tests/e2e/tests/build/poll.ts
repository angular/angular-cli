import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  silentExecAndWaitForOutputToMatch
} from '../../utils/process';
import {appendToFile} from '../../utils/fs';
import {expectToFail, wait} from '../../utils/utils';

const webpackGoodRegEx = /webpack: Compiled successfully./;

export default function() {
  return silentExecAndWaitForOutputToMatch('ng', ['serve', '--poll=10000'], webpackGoodRegEx)
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
