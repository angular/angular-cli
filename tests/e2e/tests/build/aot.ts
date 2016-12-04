import { ng } from '../../utils/process';
import { expectFileToMatch } from '../../utils/fs';
import { isUniversalTest, expectToFail, getClientDist } from '../../utils/utils';

export default function () {
  if (isUniversalTest()) {
    return Promise.resolve()
      .then(() => expectToFail(() => ng('build', '--aot')));
  } else {
    return ng('build', '--aot')
      .then(() => expectFileToMatch(`${getClientDist()}main.bundle.js`,
        /bootstrapModuleFactory.*\/\* AppModuleNgFactory \*\//));
  }
}
