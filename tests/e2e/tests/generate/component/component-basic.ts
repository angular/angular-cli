import { join } from 'node:path';
import { ng } from '../../../utils/process';
import { expectFileToExist } from '../../../utils/fs';

export default async function () {
  const componentDir = 'src/app/test-component';

  await ng('generate', 'component', 'test-component');
  await expectFileToExist(componentDir);
  await expectFileToExist(join(componentDir, 'test-component.ts'));
  await expectFileToExist(join(componentDir, 'test-component.spec.ts'));
  await expectFileToExist(join(componentDir, 'test-component.html'));
  await expectFileToExist(join(componentDir, 'test-component.css'));

  // Try to run the unit tests.
  await ng('test', '--watch=false');

  // Should generate component that is named "help".
  await ng('generate', 'component', 'help');
  await expectFileToExist('src/app/help/help.ts');
}
