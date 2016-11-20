import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import { expectToFail, getAppMain } from '../../utils/utils';


export default function() {
  return ng('build')
    .then(() => expectFileToExist(`dist/${getAppMain()}.bundle.map`))
    .then(() => ng('build', '--no-sourcemap'))
    .then(() => expectToFail(() => expectFileToExist(`dist/${getAppMain()}.bundle.map`)));
}
