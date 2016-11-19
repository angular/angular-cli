import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import { expectToFail, isUniversalTest } from '../../utils/utils';


export default function() {
  const bundleMap = isUniversalTest() ? 'client.bundle.map' : 'main.bundle.map';

  return ng('build')
    .then(() => expectFileToExist(`dist/${bundleMap}`))
    .then(() => ng('build', '--no-sourcemap'))
    .then(() => expectToFail(() => expectFileToExist(`dist/${bundleMap}`)));
}
