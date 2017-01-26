import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  silentExecAndWaitForOutputToMatch,
} from '../../utils/process';
import {writeFile, prependToFile, appendToFile} from '../../utils/fs';
import {wait} from '../../utils/utils';


export default function() {
  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }

  return silentExecAndWaitForOutputToMatch('ng', ['serve'], /webpack: bundle is now VALID/)
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
      import { funky } from './funky';
    `))
    .then(() => appendToFile('src/main.ts', `
      console.log(funky('town'));
    `))
    // Should trigger a rebuild, no error expected.
    .then(() => waitForAnyProcessOutputToMatch(/webpack: bundle is now VALID/, 5000))
    // Create and import files.
    .then(() => wait(2000))
    .then(() => writeFile('src/funky2.ts', `
      export function funky(value: number): number {
        return value + 1;
      }
    `))
    // Should trigger a rebuild, this time an error is expected.
    .then(() => waitForAnyProcessOutputToMatch(/webpack: bundle is now VALID/, 5000))
    .then(({ stdout }) => {
      if (!/ERROR in .*\/src\/main\.ts \(/.test(stdout)) {
        throw new Error('Expected an error but none happened.');
      }
    })
    // Fix the error!
    .then(() => writeFile('src/funky2.ts', `
      export function funky(value: string): string {
        return value + 'hello';
      }
    `))
    .then(() => waitForAnyProcessOutputToMatch(/webpack: bundle is now VALID/, 5000))
    .then(({ stdout }) => {
      if (/ERROR in .*\/src\/main\.ts \(/.test(stdout)) {
        throw new Error('Expected no error but an error was shown.');
      }
    })
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
