import assert from 'node:assert/strict';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, prependToFile, writeFile } from '../../utils/fs';
import { execAndWaitForOutputToMatch, waitForAnyProcessOutputToMatch } from '../../utils/process';

const doneRe = getGlobalVariable('argv')['esbuild']
  ? /Application bundle generation complete\./
  : / Compiled successfully\.|: Failed to compile\./;
const errorRe = /Error/i;

export default function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }

  return (
    Promise.resolve()
      // Create and import files.
      .then(() =>
        writeFile(
          'src/funky2.ts',
          `
      export function funky2(value: string): string {
        return value + 'hello';
      }
    `,
        ),
      )
      .then(() =>
        writeFile(
          'src/funky.ts',
          `
      export * from './funky2';
    `,
        ),
      )
      .then(() =>
        prependToFile(
          'src/main.ts',
          `
      import { funky2 } from './funky';
    `,
        ),
      )
      .then(() =>
        appendToFile(
          'src/main.ts',
          `
      console.log(funky2('town'));
    `,
        ),
      )
      // Should trigger a rebuild, no error expected.
      .then(() => execAndWaitForOutputToMatch('ng', ['serve'], doneRe))
      // Make an invalid version of the file.
      // Should trigger a rebuild, this time an error is expected.
      .then(() =>
        Promise.all([
          waitForAnyProcessOutputToMatch(errorRe, 20000),
          writeFile(
            'src/funky2.ts',
            `
        export function funky2(value: number): number {
          return value + 1;
        }
      `,
          ),
        ]),
      )
      .then((results) => {
        const { stderr } = results[0];
        assert.match(
          stderr,
          /Argument of type 'string' is not assignable to parameter of type 'number'/,
        );
      })
      // Change an UNRELATED file and the error should still happen.
      // Should trigger a rebuild, this time an error is also expected.
      .then(() =>
        Promise.all([
          waitForAnyProcessOutputToMatch(errorRe, 20000),
          appendToFile(
            'src/app/app.config.ts',
            `
        function anything(): number { return 1; }
      `,
          ),
        ]),
      )
      .then((results) => {
        const { stderr } = results[0];
        assert.match(
          stderr,
          /Argument of type 'string' is not assignable to parameter of type 'number'/,
        );
      })
      // Fix the error!
      .then(() =>
        Promise.all([
          waitForAnyProcessOutputToMatch(doneRe, 20000),
          writeFile(
            'src/funky2.ts',
            `
        export function funky2(value: string): string {
          return value + 'hello';
        }
      `,
          ),
        ]),
      )
      .then((results) => {
        const { stderr } = results[0];
        assert.doesNotMatch(
          stderr,
          /Argument of type 'string' is not assignable to parameter of type 'number'/,
        );
      })
  );
}
