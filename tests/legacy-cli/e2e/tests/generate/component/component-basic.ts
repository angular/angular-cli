import { join } from 'node:path';
import { ng } from '../../../utils/process';
import { expectFileToExist } from '../../../utils/fs';

export default function () {
  const projectDir = join('src', 'app');
  const componentDir = join(projectDir, 'test-component');

  return (
    ng('generate', 'component', 'test-component')
      .then(() => expectFileToExist(componentDir))
      .then(() => expectFileToExist(join(componentDir, 'test-component.component.ts')))
      .then(() => expectFileToExist(join(componentDir, 'test-component.component.spec.ts')))
      .then(() => expectFileToExist(join(componentDir, 'test-component.component.ng.html')))
      .then(() => expectFileToExist(join(componentDir, 'test-component.component.css')))

      // Try to run the unit tests.
      .then(() => ng('test', '--watch=false'))
  );
}
