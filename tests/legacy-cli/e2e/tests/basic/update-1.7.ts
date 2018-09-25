import { createProjectFromAsset } from '../../utils/assets';
import { ng, silentNpm } from '../../utils/process';
import { useBuiltPackages, useCIChrome, useCIDefaults } from '../../utils/project';
import { expectToFail } from '../../utils/utils';


export default function () {
  return Promise.resolve()
    .then(() => createProjectFromAsset('1.7-project'))
    .then(() => useCIChrome('.'))
    .then(() => expectToFail(() => ng('build')))
    .then(() => ng('update', '@angular/cli'))
    .then(() => useBuiltPackages())
    .then(() => silentNpm('install'))
    .then(() => useCIDefaults('latest-project'))
    .then(() => ng('generate', 'component', 'my-comp'))
    .then(() => ng('test', '--watch=false'))
    .then(() => ng('lint'))
    .then(() => ng('build', '--prod'))
    .then(() => ng('e2e'));
}
