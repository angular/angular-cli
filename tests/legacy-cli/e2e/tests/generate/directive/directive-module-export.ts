import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const modulePath = join('src', 'app', 'app.module.ts');

  return ng('generate', 'directive', 'test-directive', '--export')
    .then(() => expectFileToMatch(modulePath, /exports: \[\r?\n(\s*)  TestDirectiveDirective\r?\n\1\]/))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
