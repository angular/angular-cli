import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  silentExecAndWaitForOutputToMatch,
} from '../../utils/process';
import {writeFile, prependToFile, appendToFile} from '../../utils/fs';
import {wait} from '../../utils/utils';
import {getGlobalVariable} from '../../utils/env';


const doneRe =
  /webpack: bundle is now VALID|webpack: Compiled successfully.|webpack: Failed to compile./;


export default function() {
  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }
  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  return Promise.resolve()
    // Create and import files.
    .then(() => writeFile('src/funky2.ts', `
      export function funky2(value: string): string {
        return value + 'hello';
      }
    `))
    .then(() => writeFile('src/funky.ts', `
      export * from './funky2';
    `))
    .then(() => prependToFile('src/main.ts', `
      import { funky2 } from './funky';
    `))
    .then(() => appendToFile('src/main.ts', `
      console.log(funky2('town'));
    `))
    .then(() => wait(2000))
    // Should trigger a rebuild, no error expected.
    .then(() => silentExecAndWaitForOutputToMatch('ng', ['serve'], doneRe))
    // Make an invalid version of the file.
    .then(() => writeFile('src/funky2.ts', `
      export function funky2(value: number): number {
        return value + 1;
      }
    `))
    // Should trigger a rebuild, this time an error is expected.
    .then(() => waitForAnyProcessOutputToMatch(doneRe, 10000))
    .then(({ stderr }) => {
      if (!/ERROR in .*\/src\/main\.ts \(/.test(stderr)) {
        throw new Error('Expected an error but none happened.');
      }
    })
    // Change an UNRELATED file and the error should still happen.
    .then(() => wait(2000))
    .then(() => appendToFile('src/app/app.module.ts', `
      function anything(): number {}
    `))
    // Should trigger a rebuild, this time an error is expected.
    .then(() => waitForAnyProcessOutputToMatch(doneRe, 10000))
    .then(({ stderr }) => {
      if (!/ERROR in .*\/src\/main\.ts \(/.test(stderr)) {
        throw new Error('Expected an error but none happened.');
      }
    })
    // Fix the error!
    .then(() => writeFile('src/funky2.ts', `
      export function funky2(value: string): string {
        return value + 'hello';
      }
    `))
    .then(() => waitForAnyProcessOutputToMatch(doneRe, 10000))
    .then(({ stderr }) => {
      if (/ERROR in .*\/src\/main\.ts \(/.test(stderr)) {
        throw new Error('Expected no error but an error was shown.');
      }
    })
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
