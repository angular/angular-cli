import { ng } from '../../utils/process';
import { expectFileToMatch } from '../../utils/fs';
import { getClientDist, getAppMain, getMainAppModuleRegex } from '../../utils/utils';

export default function () {
  return ng('build', '--aot')
    .then(() => expectFileToMatch(`${getClientDist()}${getAppMain()}.bundle.js`,
      getMainAppModuleRegex()));
}
