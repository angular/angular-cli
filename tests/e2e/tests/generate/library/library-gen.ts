import { ng, silentNpm } from '../../../utils/process';
import { expectFileToMatch } from '../../../utils/fs';
import { useCIChrome } from '../../../utils/project';

// tslint:disable:max-line-length
export default function () {
  return ng('generate', 'library', 'my-lib')
    .then(() => useCIChrome('projects/my-lib'))
    .then(() => silentNpm('install'))
    .then(() => ng('generate', 'component', 'comp', '--project', 'my-lib'))
    .then(() => expectFileToMatch('projects/my-lib/src/lib/comp/comp.component.ts', 'CompComponent'))
    .then(() => ng('build', 'my-lib'))
    .then(() => ng('test', 'my-lib', '--watch=false'));
}
