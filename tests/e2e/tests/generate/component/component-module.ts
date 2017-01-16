import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const modulePath = join('src', 'app', 'app.module.ts');

  return ng('generate', 'component', 'component-test', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(modulePath,
      /import { ComponentTestComponent } from '.\/component-test\/component-test.component'/))

    // Try to run the unit tests.
    .then(() => ng('build'));
}
