import { silentNg } from '../../../utils/process';
import { replaceInFile } from '../../../utils/fs';

export default async function () {
  // Suites block need to be added in the protractor.conf.js file to test suites
  await replaceInFile(
    'e2e/protractor.conf.js',
    `allScriptsTimeout: 11000,`,
    `allScriptsTimeout: 11000,
        suites: {
          app: './e2e/src/app.e2e-spec.ts'
        },
    `,
  );
  await silentNg('e2e', 'test-project', '--suite=app');
}
