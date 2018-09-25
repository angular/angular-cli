import { createProjectFromAsset } from '../../utils/assets';
import { ng, silentNpm } from '../../utils/process';
import { useBuiltPackages } from '../../utils/project';
import { expectToFail } from '../../utils/utils';


export default function () {
  return Promise.resolve()
    .then(() => createProjectFromAsset('1.7-project'))
    .then(() => expectToFail(() => ng('build')))
    .then(() => ng('update', '@angular/cli', '--migrate-only', '--from=1.7.1'))
    .then(() => useBuiltPackages())
    .then(() => silentNpm('install'))
    .then(() => ng('build'));
}
