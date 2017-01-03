import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const modulePath = join('src', 'app', 'app.module.ts');

  return ng('generate', 'directive', 'test-directive', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(modulePath,
      /import { TestDirectiveDirective } from '.\/test-directive.directive'/))

    // Try to run the unit tests.
    .then(() => ng('build'));
}
