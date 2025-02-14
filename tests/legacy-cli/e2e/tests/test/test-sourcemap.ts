import assert from 'node:assert';
import { getGlobalVariable } from '../../utils/env';
import { writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { assertIsError } from '../../utils/utils';

export default async function () {
  if (getGlobalVariable('argv')['esbuild']) {
    // TODO: enable once this is fixed when using the esbuild builder.
    return;
  }

  await writeFile(
    'src/app/app.component.spec.ts',
    `
      it('should fail', () => {
        expect(undefined).toBeTruthy();
      });
    `,
  );

  // when sourcemaps are 'on' the stacktrace will point to the spec.ts file.
  try {
    await ng('test', '--no-watch', '--source-map');
    throw new Error('ng test should have failed.');
  } catch (error) {
    assertIsError(error);
    assert.match(error.message, /src\/app\/app\.component\.spec\.ts/);
    assert.doesNotMatch(error.message, /_karma_webpack_/);
  }

  // when sourcemaps are 'off' the stacktrace won't point to the spec.ts file.
  try {
    await ng('test', '--no-watch', '--no-source-map');
    throw new Error('ng test should have failed.');
  } catch (error) {
    assertIsError(error);
    assert.match(error.message, /main\.js/);
  }
}
