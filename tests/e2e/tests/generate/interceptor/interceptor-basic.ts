import { join } from 'node:path';
import { ng } from '../../../utils/process';
import { expectFileToExist } from '../../../utils/fs';

export default function () {
  // Does not create a sub directory.
  const interceptorDir = join('src', 'app');

  return (
    ng('generate', 'interceptor', 'test')
      .then(() => expectFileToExist(interceptorDir))
      .then(() => expectFileToExist(join(interceptorDir, 'test-interceptor.ts')))
      .then(() => expectFileToExist(join(interceptorDir, 'test-interceptor.spec.ts')))

      // Try to run the unit tests.
      .then(() => ng('test', '--watch=false'))
  );
}
