import { expectFileNotToExist, expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { useCIChrome } from '../../../utils/project';

export default async function () {
  await ng('generate', 'application', 'app2', '--standalone');
  await expectFileToMatch('angular.json', /\"app2\":/);
  await expectFileToMatch('projects/app2/src/main.ts', /bootstrapApplication/);
  await expectFileNotToExist('projects/app2/src/app/app.module.ts');
  await useCIChrome('app2', 'projects/app2');
  return ng('test', 'app2', '--watch=false');
}
