import { ng } from '../../utils/process';
import { expectFileToExist } from '../../utils/fs';
import { expectToFail, getAppMain, getClientDist } from '../../utils/utils';


export default function () {
  return ng('build')
    .then(() => expectFileToExist(`${getClientDist()}${getAppMain()}.bundle.map`))
    .then(() => ng('build', '--no-sourcemap'))
    .then(() => expectToFail(() => expectFileToExist(
      `${getClientDist()}${getAppMain()}.bundle.map`
      ))
    );
}
