import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist} from '../../../utils/fs';


export default function() {
  const componentDir = join('src', 'app', 'component-test');

  return ng('generate', 'component', 'component-test')
    .then(() => expectFileToExist(componentDir))
    .then(() => expectFileToExist(join(componentDir, 'component-test.component.ts')))
    .then(() => expectFileToExist(join(componentDir, 'component-test.component.spec.ts')))
    .then(() => expectFileToExist(join(componentDir, 'component-test.component.html')))
    .then(() => expectFileToExist(join(componentDir, 'component-test.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
