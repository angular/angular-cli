import assert from 'node:assert';
import { writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { assertIsError } from '../../utils/utils';
import { updateJsonFile } from '../../utils/project';
import { getGlobalVariable } from '../../utils/env';

export default async function () {
  const isWebpack = !getGlobalVariable('argv')['esbuild'];

  await writeFile(
    'src/app/app.spec.ts',
    `
      it('should fail', () => {
        expect(undefined).toBeTruthy();
      });
    `,
  );

  // when sourcemaps are 'on' the stacktrace will point to the spec.ts file.
  await updateJsonFile('angular.json', (configJson) => {
    const appArchitect = configJson.projects['test-project'].architect;
    if (isWebpack) {
      appArchitect['test'].options.sourceMap = true;
    } else {
      appArchitect['build'].configurations.development.sourceMap = true;
    }
  });
  try {
    await ng('test', '--no-watch');
    throw new Error('ng test should have failed.');
  } catch (error) {
    assertIsError(error);
    assert.match(error.message, /\(src\/app\/app\.spec\.ts:3:27/);
    assert.doesNotMatch(error.message, /_karma_webpack_/);
  }

  // when sourcemaps are 'off' the stacktrace won't point to the spec.ts file.
  await updateJsonFile('angular.json', (configJson) => {
    const appArchitect = configJson.projects['test-project'].architect;
    if (isWebpack) {
      appArchitect['test'].options.sourceMap = false;
    } else {
      appArchitect['build'].configurations.development.sourceMap = false;
    }
  });
  try {
    await ng('test', '--no-watch');
    throw new Error('ng test should have failed.');
  } catch (error) {
    assertIsError(error);
    assert.match(error.message, /main\.js/);
  }
}
