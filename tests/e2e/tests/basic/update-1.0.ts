import { createProjectFromAsset } from '../../utils/assets';
import { expectToFail } from '../../utils/utils';
import { ng } from '../../utils/process';
import { useCIChrome } from '../../utils/project';


export default function () {
  return Promise.resolve()
    .then(() => createProjectFromAsset('1.0-project'))
    .then(() => useCIChrome('.'))
    .then(() => expectToFail(() => ng('build')))
    .then(() => ng('update', '@angular/cli'))
    .then(() => ng('generate', 'component', 'my-comp'))
    .then(() => ng('test'))
    .then(() => ng('lint'))
    .then(() => ng('build', '--prod'))
    .then(() => ng('e2e'));
}
