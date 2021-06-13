import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { writeFile, appendToFile, readFile, replaceInFile } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';
import { expectToFail } from '../../utils/utils';

const extraErrors = [
  `Final loader didn't return a Buffer or String`,
  `doesn't contain a valid alias configuration`,
  `main.ts is not part of the TypeScript compilation.`,
];

export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }

  // Skip this test in Angular 2/4.
  if (getGlobalVariable('argv').ng2 || getGlobalVariable('argv').ng4) {
    return Promise.resolve();
  }

  let origContent: string;

  return (
    Promise.resolve()
      // Save the original contents of `./src/app/app.component.ts`.
      .then(() => readFile('./src/app/app.component.ts'))
      .then(contents => (origContent = contents))
      // Check `part of the TypeScript compilation` errors.
      // These should show an error only for the missing file.
      .then(() =>
        updateJsonFile('./tsconfig.app.json', configJson => {
          (configJson.include = undefined), (configJson.files = ['src/main.ts']);
        }),
      )
      .then(() => expectToFail(() => ng('build')))
      .then(({ message }) => {
        if (!message.includes('polyfills.ts is missing from the TypeScript compilation')) {
          throw new Error(`Expected missing TS file error, got this instead:\n${message}`);
        }
        if (extraErrors.some(e => message.includes(e))) {
          throw new Error(`Did not expect extra errors but got:\n${message}`);
        }
      })
      .then(() =>
        updateJsonFile('./tsconfig.app.json', configJson => {
          configJson.include = ['src/**/*.ts'];
          configJson.exclude = ['**/**.spec.ts'];
          configJson.files = undefined;
        }),
      )
      // Check simple single syntax errors.
      // These shouldn't skip emit and just show a TS error.
      .then(() => appendToFile('./src/app/app.component.ts', ']]]'))
      .then(() => expectToFail(() => ng('build')))
      .then(({ message }) => {
        if (!message.includes('Declaration or statement expected.')) {
          throw new Error(`Expected syntax error, got this instead:\n${message}`);
        }
        if (extraErrors.some(e => message.includes(e))) {
          throw new Error(`Did not expect extra errors but got:\n${message}`);
        }
      })
      .then(() => writeFile('./src/app/app.component.ts', origContent))
      // Check errors when files were not emitted due to static analysis errors.
      .then(() => replaceInFile('./src/app/app.component.ts', `'app-root'`, `(() => 'app-root')()`))
      .then(() => expectToFail(() => ng('build', '--aot')))
      .then(({ message }) => {
        if (
          !message.includes('Function calls are not supported') &&
          !message.includes('Function expressions are not supported in decorators') &&
          !message.includes('selector must be a string')
        ) {
          throw new Error(`Expected static analysis error, got this instead:\n${message}`);
        }
        if (extraErrors.some(e => message.includes(e))) {
          throw new Error(`Did not expect extra errors but got:\n${message}`);
        }
      })
      .then(() => writeFile('./src/app/app.component.ts', origContent))
  );
}