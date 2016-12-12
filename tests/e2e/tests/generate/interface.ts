import {join} from 'path';
import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';


export default function() {
  const interfaceDir = join('src', 'app');

  return ng('generate', 'interface', 'interface-test', 'model')
    .then(() => expectFileToExist(interfaceDir))
    .then(() => expectFileToExist(join(interfaceDir, 'interface-test.model.ts')))

    // Try to run the unit tests.
    .then(() => ng('test', '--single-run'));
}
