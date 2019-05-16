import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  execAndWaitForOutputToMatch,
} from '../../utils/process';
import { appendToFile, writeMultipleFiles, replaceInFile, expectFileToMatch } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';

const validBundleRegEx = /: Compiled successfully./;

export default function () {
  // TODO(architect): This test is behaving oddly both here and in devkit/build-angular.
  // It seems to be because of file watchers.
  return;

  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }

  // Skip this test in Angular 2/4.
  if (getGlobalVariable('argv').ng2 || getGlobalVariable('argv').ng4) {
    return Promise.resolve();
  }

  return execAndWaitForOutputToMatch('ng', ['build', '--watch', '--aot'], validBundleRegEx)
    .then(() => writeMultipleFiles({
      'src/app/app.component.css': `
        @import './imported-styles.css';
        body {background-color: #00f;}
      `,
      'src/app/imported-styles.css': 'p {color: #f00;}',
    }))
    // Trigger a few rebuilds first.
    // The AOT compiler is still optimizing rebuilds on the first rebuild.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(validBundleRegEx, 10000),
      appendToFile('src/main.ts', 'console.log(1)\n')
    ]))
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(validBundleRegEx, 10000),
      appendToFile('src/main.ts', 'console.log(1)\n')
    ]))
    // Check if html changes are built.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(validBundleRegEx, 10000),
      appendToFile('src/app/app.component.html', '<p>HTML_REBUILD_STRING<p>')
    ]))
    .then(() => expectFileToMatch('dist/test-project/main.js', 'HTML_REBUILD_STRING'))
    // Check if css changes are built.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(validBundleRegEx, 10000),
      appendToFile('src/app/app.component.css', 'CSS_REBUILD_STRING {color: #f00;}')
    ]))
    .then(() => expectFileToMatch('dist/test-project/main.js', 'CSS_REBUILD_STRING'))
    // Check if css dependency changes are built.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(validBundleRegEx, 10000),
      appendToFile('src/app/imported-styles.css', 'CSS_DEP_REBUILD_STRING {color: #f00;}')
    ]))
    .then(() => expectFileToMatch('dist/test-project/main.js', 'CSS_DEP_REBUILD_STRING'))
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(validBundleRegEx, 10000),
      replaceInFile('src/app/app.component.ts', 'app-root', 'app-root-FACTORY_REBUILD_STRING')
    ]))
    .then(() => expectFileToMatch('dist/test-project/main.js', 'FACTORY_REBUILD_STRING'))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
