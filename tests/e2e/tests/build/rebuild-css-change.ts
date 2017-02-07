import {
  killAllProcesses,
  exec,
  waitForAnyProcessOutputToMatch,
  silentExecAndWaitForOutputToMatch
} from '../../utils/process';
import {appendToFile} from '../../utils/fs';

const webpackGoodRegEx = /webpack: bundle is now VALID|webpack: Compiled successfully./;
const webpackBadRegEx = /webpack: bundle is now INVALID|webpack: Compiling.../;

export default function() {
  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }

  return silentExecAndWaitForOutputToMatch('ng', ['serve'], webpackGoodRegEx)
    // Should trigger a rebuild.
    .then(() => exec('touch', 'src/main.ts'))
    .then(() => waitForAnyProcessOutputToMatch(webpackBadRegEx, 10000))
    .then(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 10000))
    .then(() => appendToFile('src/app/app.component.css', ':host { color: blue; }'))
    .then(() => waitForAnyProcessOutputToMatch(webpackBadRegEx, 10000))
    .then(() => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 10000))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
