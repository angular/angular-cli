import assert from 'assert';
import { appendToFile, expectFileToExist, expectFileToMatch, readFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { libraryConsumptionSetup } from './setup';
import { updateJsonFile } from '../../../utils/project';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  await ng('cache', 'off');
  await libraryConsumptionSetup();

  // Add an unused class as part of the public api.
  await appendToFile(
    'projects/my-lib/src/public-api.ts',
    `
    function something() {
      return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        console.log("someDecorator");
      };
    }

    export class ExampleClass {
      @something()
      method() {}
    }
  `,
  );

  // build the lib
  await ng('build', 'my-lib', '--configuration=production');
  const packageJson = JSON.parse(await readFile('dist/my-lib/package.json'));
  assert.equal(packageJson.sideEffects, false);

  // build the app
  await ng('build', 'test-project', '--configuration=production', '--output-hashing=none');
  // Output should not contain `ExampleClass` as the library is marked as side-effect free.
  await expectFileToExist('dist/test-project/browser/main.js');
  await expectToFail(() => expectFileToMatch('dist/test-project/browser/main.js', 'someDecorator'));

  // Mark library as side-effectful.
  await updateJsonFile('dist/my-lib/package.json', (packageJson) => {
    packageJson.sideEffects = true;
  });

  // build the app
  await ng('build', 'test-project', '--configuration=production', '--output-hashing=none');
  // Output should  contain `ExampleClass` as the library is marked as side-effectful.
  await expectFileToMatch('dist/test-project/browser/main.js', 'someDecorator');
}
