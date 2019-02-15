import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  execAndWaitForOutputToMatch,
} from '../../utils/process';
import { replaceInFile, readFile, writeFile } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';
import { wait, expectToFail } from '../../utils/utils';


const failedRe = /: Failed to compile/;
const successRe = /: Compiled successfully/;
const errorRe = /ERROR in/;
const extraErrors = [
  `Final loader didn't return a Buffer or String`,
  `doesn't contain a valid alias configuration`,
  `main.ts is not part of the TypeScript compilation.`,
];

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

  let origContent: string;

  return Promise.resolve()
    // Save the original contents of `./src/app/app.component.ts`.
    .then(() => readFile('./src/app/app.component.ts'))
    .then((contents) => origContent = contents)
    // Add a major static analysis error on a non-main file to the initial build.
    .then(() => replaceInFile('./src/app/app.component.ts', `'app-root'`, `(() => 'app-root')()`))
    // Should have an error.
    .then(() => execAndWaitForOutputToMatch('ng', ['build', '--watch', '--aot'], failedRe))
    .then((results) => {
      const stderr = results.stderr;
      if (!stderr.includes('Function calls are not supported')
        && !stderr.includes('Function expressions are not supported in decorators')) {
        throw new Error(`Expected static analysis error, got this instead:\n${stderr}`);
      }
      if (extraErrors.some((e) => stderr.includes(e))) {
        throw new Error(`Did not expect extra errors but got:\n${stderr}`);
      }
    })
    // Fix the error, should trigger a successful rebuild.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(successRe, 20000),
      writeFile('src/app/app.component.ts', origContent)
    ]))
    .then(() => wait(2000))
    // Add an syntax error to a non-main file.
    // Build should still be successfull and error reported on forked type checker.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(errorRe, 20000),
      writeFile('src/app/app.component.ts', origContent + '\n]]]]]')
    ]))
    .then((results) => {
      const stderr = results[0].stderr;
      if (!stderr.includes('Declaration or statement expected.')) {
        throw new Error(`Expected syntax error, got this instead:\n${stderr}`);
      }
      if (extraErrors.some((e) => stderr.includes(e))) {
        throw new Error(`Did not expect extra errors but got:\n${stderr}`);
      }
    })
    // Fix the error, should trigger a successful rebuild.
    // We have to wait for the type checker to run, so we expect to NOT
    // have an error message in 5s.
    .then(() => Promise.all([
      expectToFail(() => waitForAnyProcessOutputToMatch(errorRe, 5000)),
      writeFile('src/app/app.component.ts', origContent)
    ]))
    .then(() => wait(2000))
    // Add a major static analysis error on a rebuild.
    // Should fail the rebuild.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(failedRe, 20000),
      replaceInFile('./src/app/app.component.ts', `'app-root'`, `(() => 'app-root')()`)
    ]))
    .then((results) => {
      const stderr = results[0].stderr;
      if (!stderr.includes('Function calls are not supported')
        && !stderr.includes('Function expressions are not supported in decorators')) {
        throw new Error(`Expected static analysis error, got this instead:\n${stderr}`);
      }
      if (extraErrors.some((e) => stderr.includes(e))) {
        throw new Error(`Did not expect extra errors but got:\n${stderr}`);
      }
    })
    // Fix the error, should trigger a successful rebuild.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(successRe, 20000),
      writeFile('src/app/app.component.ts', origContent)
    ]))
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
