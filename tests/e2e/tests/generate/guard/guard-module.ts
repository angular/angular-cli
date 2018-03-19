import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const modulePath = join('projects', 'test-project', 'src', 'app', 'app.module.ts');

  return ng('generate', 'guard', 'test-guard', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(modulePath,
      /import { TestGuardGuard } from '.\/test-guard.guard'/))
    .then(() => expectFileToMatch(modulePath,
      /providers:\s*\[TestGuardGuard\]/m))

    .then(() => process.chdir(join('projects', 'test-project', 'src', 'app')))
    .then(() => ng('generate', 'guard', 'test-guard2', '--module', 'app.module.ts'))
    .then(() => process.chdir('../../../..'))
    .then(() => expectFileToMatch(modulePath,
      /import { TestGuard2Guard } from '.\/test-guard2.guard'/));

    // TODO: Enable once schematic is updated for rxjs 6
    // .then(() => ng('build'));
}
