import { writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  await writeFile(
    'src/app/app.component.spec.ts',
    `
      it('show fail', () => {
        expect(undefined).toBeTruthy();
      });
    `,
  );

  // when sourcemaps are 'on' the stacktrace will point to the spec.ts file.
  try {
    await ng('test', '--no-watch', '--source-map');
    throw new Error('ng test should have failed.');
  } catch (error) {
    if (!(error instanceof Error && error.message.includes('app.component.spec.ts'))) {
      throw error;
    }
  }

  // when sourcemaps are 'off' the stacktrace won't point to the spec.ts file.
  try {
    await ng('test', '--no-watch', '--no-source-map');
    throw new Error('ng test should have failed.');
  } catch (error) {
    if (!(error instanceof Error && error.message.includes('main.js'))) {
      throw error;
    }
  }
}
