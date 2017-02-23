import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const modulePath = join('src', 'app', 'app.module.ts');

  return ng('generate', 'guard', 'test-guard', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(modulePath,
      /import { TestGuardGuard } from '.\/test-guard.guard'/))
    .then(() => expectFileToMatch(modulePath,
      /providers:\s*\[TestGuardGuard\]/m))
    .then(() => ng('build'));
}
