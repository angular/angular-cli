import { expectFileToExist, replaceInFile } from '../../utils/fs';
import { execAndWaitForOutputToMatch } from '../../utils/process';

export default async function () {
  await replaceInFile(
    '.browserslistrc',
    'not IE 11',
    'IE 11',
  );

  await execAndWaitForOutputToMatch('ng', ['build', '--watch', '--configuration=development'], /Initial Total/i);
  await expectFileToExist('dist/test-project/runtime-es2017.js');
  await expectFileToExist('dist/test-project/main-es2017.js');
}
