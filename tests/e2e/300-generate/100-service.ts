import {join} from 'path';
import {ng, expectFileToExist} from '../utils';


export default function() {
  const componentDir = join(process.cwd(), 'src', 'app', 'test-component');

  return ng('generate', 'service', 'test-service')
    .then(() => expectFileToExist(componentDir))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.ts')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.html')))
    .then(() => expectFileToExist(join(componentDir, 'test-component.component.css')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
