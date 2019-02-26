import { writeFile } from '../../utils/fs';
import { execAndWaitForOutputToMatch, killAllProcesses } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  await updateJsonFile('angular.json', configJson => {
    const appArchitect = configJson.projects['test-project'].architect;
    appArchitect.test.options.sourceMap = {
      scripts: true,
    };
  });

  await writeFile('src/app/app.component.spec.ts', `
      it('show fail', () => {
        expect(undefined).toBeTruthy();
      });
    `);

  // when sourcemaps are not working the stacktrace won't point to the spec.ts file.
  try {
    await execAndWaitForOutputToMatch(
      'ng',
      ['test', '--watch', 'false'],
      /app\.component\.spec\.ts/,
    );
  } finally {
    killAllProcesses();
  }
}
