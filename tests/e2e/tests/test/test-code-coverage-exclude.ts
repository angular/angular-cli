import { getGlobalVariable } from '../../utils/env';
import { expectFileToExist, rimraf } from '../../utils/fs';
import { silentNg } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  const isWebpack = !getGlobalVariable('argv')['esbuild'];
  const coverageOptionName = isWebpack ? '--code-coverage' : '--coverage';

  // This test is already in build-angular, but that doesn't run on Windows.
  await silentNg('test', '--no-watch', coverageOptionName);
  await expectFileToExist('coverage/test-project/app.ts.html');
  // Delete coverage directory
  await rimraf('coverage');

  await silentNg(
    'test',
    '--no-watch',
    coverageOptionName,
    `${coverageOptionName}-exclude='src/**/app.ts'`,
  );

  // Doesn't include excluded.
  await expectFileToExist('coverage/test-project/index.html');
  await expectToFail(() => expectFileToExist('coverage/test-project/app.ts.html'));
}
