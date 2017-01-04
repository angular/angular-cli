import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const modulePath = join('src', 'app', 'app.module.ts');

  return ng('generate', 'directive', 'directive-test', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(modulePath,
      /import { DirectiveTestDirective } from '.\/directive-test.directive'/))

    // Try to run the unit tests.
    .then(() => ng('build'));
}
