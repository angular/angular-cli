import {join} from 'path';
import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';


export default function() {
  // Does not create a sub directory.
  const serviceDir = join('src', 'app');

  return ng('generate', 'service', 'service-test')
    .then(() => expectFileToExist(serviceDir))
    .then(() => expectFileToExist(join(serviceDir, 'service-test.service.ts')))
    .then(() => expectFileToExist(join(serviceDir, 'service-test.service.spec.ts')))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
