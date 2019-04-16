import { replaceInFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';


export default async function () {
  // Should fail, there is no default deploy target.
  await expectToFail(() => ng('deploy'));
  // Let's pretend the lint target is actually called deploy.
  await replaceInFile('angular.json', '"lint"', '"deploy"');
  // Should now not fail. Won't really deploy anything though.
  await ng('deploy');
}
