import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToExist} from '../../../utils/fs';


export default function() {
  // Does not create a sub directory.
  const resolverDir = join('src', 'app');

  return ng('generate', 'resolver', 'test-resolver', '--spec')
    .then(() => expectFileToExist(resolverDir))
    .then(() => expectFileToExist(join(resolverDir, 'test-resolver.resolver.ts')))
    .then(() => expectFileToExist(join(resolverDir, 'test-resolver.resolver.spec.ts')))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
