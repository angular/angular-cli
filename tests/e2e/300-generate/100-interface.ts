import {join} from 'path';
import {ng, expectFileToExist, gitClean} from '../utils';


export default function() {
  const interfaceDir = join(process.cwd(), 'src', 'app');

  return ng('generate', 'interface', 'test-interface', 'model')
    .then(() => expectFileToExist(interfaceDir))
    .then(() => expectFileToExist(join(interfaceDir, 'test-interface.model.ts')))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'))
    .then(() => gitClean());
}
