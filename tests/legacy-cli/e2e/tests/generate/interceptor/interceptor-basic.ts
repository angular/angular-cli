import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist} from '../../../utils/fs';


export default function() {
  // Does not create a sub directory.
  const interceptorDir = join('src', 'app');

  return ng('generate', 'interceptor', 'test-interceptor')
    .then(() => expectFileToExist(interceptorDir))
    .then(() => expectFileToExist(join(interceptorDir, 'test-interceptor.interceptor.ts')))
    .then(() => expectFileToExist(join(interceptorDir, 'test-interceptor.interceptor.spec.ts')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
