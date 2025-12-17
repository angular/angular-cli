import { expectFileMatchToExist, replaceInFile } from '../../utils/fs';
import { installPackage } from '../../utils/packages';
import { silentNg } from '../../utils/process';

const E2E_CUSTOM_LAUNCHER = `
  customLaunchers: {
    ChromeHeadlessNoSandbox: {
      base: 'ChromeHeadless',
      flags: ['--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage'],
    },
  },
  restartOnFileChange: true,
`;

export default async function () {
  await installPackage('karma-junit-reporter');
  await silentNg('generate', 'config', 'karma');

  await replaceInFile('karma.conf.js', 'karma-jasmine-html-reporter', 'karma-junit-reporter');
  await replaceInFile('karma.conf.js', `'kjhtml'`, `'junit'`);

  await replaceInFile('karma.conf.js', `restartOnFileChange: true`, E2E_CUSTOM_LAUNCHER);

  await silentNg('test', '--no-watch');

  await expectFileMatchToExist('.', /TESTS\-.+\.xml/);
}
