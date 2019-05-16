import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist, expectFileToMatch} from '../../../utils/fs';


export default function() {
  const projectDir = join('src', 'app');
  const componentDir = join(projectDir, 'test-component');

  const importCheck =
    `import { TestComponentComponent } from './test-component/test-component.component';`;
  return ng('generate', 'component', 'test-component')
    .then(() => expectFileToExist(componentDir))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.spec.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.html')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.css')))
    .then(() => expectFileToMatch(join(projectDir, 'app.module.ts'), importCheck))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
