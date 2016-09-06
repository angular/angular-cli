import {join} from 'path';
import {ng, expectFileToExist, gitClean} from '../utils';


export default function() {
  const componentDir = join(process.cwd(), 'src', 'app', 'test-component');

  return ng('generate', 'component', 'test-component')
    .then(() => expectFileToExist(componentDir))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.spec.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.html')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'))
    .then(() => gitClean());
}
