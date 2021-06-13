import { writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  await writeFile('src/app/app.component.spec.ts', `
      it('show fail', () => {
        expect(undefined).toBeTruthy();
      });
    `);

  await updateJsonFile('angular.json', configJson => {
    const appArchitect = configJson.projects['test-project'].architect;
    appArchitect.test.options.sourceMap = {
      scripts: true,
    };
  });

  // when sourcemaps are 'on' the stacktrace will point to the spec.ts file.
  try {
    await ng('test', '--watch', 'false');
    throw new Error('ng test should have failed.');
  } catch (error) {
    if (!error.message.includes('app.component.spec.ts')) {
      throw error;
    };
  }

  await updateJsonFile('angular.json', configJson => {
    const appArchitect = configJson.projects['test-project'].architect;
    appArchitect.test.options.sourceMap = true;
  });

  // when sourcemaps are 'on' the stacktrace will point to the spec.ts file.
  try {
    await ng('test', '--watch', 'false');
    throw new Error('ng test should have failed.');
  } catch (error) {
    if (!error.message.includes('app.component.spec.ts')) {
      throw error;
    };
  }

  await updateJsonFile('angular.json', configJson => {
    const appArchitect = configJson.projects['test-project'].architect;
    appArchitect.test.options.sourceMap = false;
  });

  // when sourcemaps are 'off' the stacktrace won't point to the spec.ts file.
  try {
    await ng('test', '--watch', 'false');
    throw new Error('ng test should have failed.');
  } catch (error) {
    if (!error.message.includes('main.js')) {
      throw error;
    };
  }
}
