import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const root = process.cwd();
  //                       projects/   test-project/   src/   app.module.ts
  const modulePath = join('src', 'app', 'app.module.ts');

  return ng('generate', 'component', 'test-component', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(modulePath,
      /import { TestComponentComponent } from '.\/test-component\/test-component.component'/))

    .then(() => process.chdir(join(root, 'src', 'app')))
    .then(() => ng('generate', 'component', 'test-component2', '--module', 'app.module.ts'))
    .then(() => process.chdir('../..'))
    .then(() => expectFileToMatch(modulePath,
      /import { TestComponent2Component } from '.\/test-component2\/test-component2.component'/))

    // Try to run the unit tests.
    .then(() => ng('build'));
}
