import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  execAndWaitForOutputToMatch
} from '../../utils/process';
import { appendToFile } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';
import { updateJsonFile } from '../../utils/project';

const webpackGoodRegEx = /webpack: Compiled successfully./;
const webpackWarningRegEx = /webpack: Compiled with warnings./;

export default function () {
  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }
  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }


  return execAndWaitForOutputToMatch('ng', ['serve'], webpackGoodRegEx)
    // Should trigger a rebuild.
    .then(() => appendToFile('src/app/app.component.css', 'body { color: var(--white); }'))
    // Should see some warnings
    .then(() => waitForAnyProcessOutputToMatch(webpackWarningRegEx, 10000))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    })
    // update withPostCssWarnings flag
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      configJson['defaults']['build'] = {};
      configJson['defaults']['build']['withPostCssWarnings'] = false
    }))
    // should remove warnings
    .then(() => execAndWaitForOutputToMatch('ng', ['serve'], webpackGoodRegEx))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    })
}
