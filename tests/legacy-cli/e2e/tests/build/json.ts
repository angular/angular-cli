import { expectFileToExist } from '../../utils/fs';
import { expectGitToBeClean } from '../../utils/git';
import { ng } from '../../utils/process';

export default async function() {
  await ng('build', '--stats-json');
  await expectFileToExist('./dist/test-project/stats.json');
  await expectGitToBeClean();
}
