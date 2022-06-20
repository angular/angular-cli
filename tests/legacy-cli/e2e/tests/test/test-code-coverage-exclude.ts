import { expectFileToExist, rimraf } from '../../utils/fs';
import { silentNg } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  // This test is already in build-angular, but that doesn't run on Windows.
  await silentNg('test', '--no-watch', '--code-coverage');
  await expectFileToExist('coverage/test-project/app.component.ts.html');
  // Delete coverage directory
  await rimraf('coverage');

  await silentNg(
    'test',
    '--no-watch',
    '--code-coverage',
    `--code-coverage-exclude='src/**/app.component.ts'`,
  );

  // Doesn't include excluded.
  await expectFileToExist('coverage/test-project/index.html');
  await expectToFail(() => expectFileToExist('coverage/test-project/app.component.ts.html'));
}
