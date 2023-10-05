import { getGlobalVariable } from '../../utils/env';
import { expectFileToExist } from '../../utils/fs';
import { expectGitToBeClean } from '../../utils/git';
import { ng } from '../../utils/process';

export default async function () {
  await ng('build', '--stats-json', '--configuration=development');
  if (getGlobalVariable('argv')['esbuild']) {
    await expectFileToExist('./dist/test-project/stats.json');
  } else {
    await expectFileToExist('./dist/test-project/browser/stats.json');
  }
  await expectGitToBeClean();
}
