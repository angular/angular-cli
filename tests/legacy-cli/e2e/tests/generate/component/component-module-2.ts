import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const root = process.cwd();
  const modulePath = join(root, 'src', 'app',
    'admin', 'module', 'module.module.ts');

  return Promise.resolve()
    .then(() => ng('generate', 'module', 'admin/module'))
    .then(() => ng('generate', 'component', 'other/test-component', '--module', 'admin/module'))
    .then(() => expectFileToMatch(modulePath,
      new RegExp(/import { TestComponentComponent } /.source +
                 /from '..\/..\/other\/test-component\/test-component.component'/.source)))

    // Try to run the unit tests.
    .then(() => ng('build'));
}
