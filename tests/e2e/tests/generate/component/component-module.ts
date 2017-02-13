import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const modulePath = join('src', 'app', 'app.module.ts');

  return ng('generate', 'component', 'test-component', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(modulePath,
      /import { TestComponentComponent } from '.\/test-component\/test-component.component'/))

    // Try to run the unit tests.
    .then(() => ng('build'));
}
