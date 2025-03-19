import { ng } from '../../../utils/process';
import { join } from 'node:path';
import { expectFileToExist } from '../../../utils/fs';

export default function () {
  const directiveDir = join('src', 'app');
  return (
    ng('generate', 'directive', 'test-directive')
      .then(() => expectFileToExist(join(directiveDir, 'test-directive.ts')))
      .then(() => expectFileToExist(join(directiveDir, 'test-directive.spec.ts')))

      // Try to run the unit tests.
      .then(() => ng('test', '--watch=false'))
  );
}
