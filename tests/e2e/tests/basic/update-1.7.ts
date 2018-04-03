import { createProjectFromAsset } from '../../utils/assets';
import { expectToFail } from '../../utils/utils';
import { ng } from '../../utils/process';


export default function () {
  return Promise.resolve()
    .then(() => createProjectFromAsset('1.7-project'))
    .then(() => expectToFail(() => ng('build')))
    .then(() => ng('update', '@angular/cli', '--migrate-only', '--from=1.7.1'))
    .then(() => ng('build'));
}
