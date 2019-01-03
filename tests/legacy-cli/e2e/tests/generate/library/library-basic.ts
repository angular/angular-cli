import { ng } from '../../../utils/process';
import { expectFileToMatch } from '../../../utils/fs';
import { useCIChrome } from '../../../utils/project';

export default function () {
  return ng('generate', 'library', 'my-lib')
    .then(() => expectFileToMatch('angular.json', /\"my-lib\":/))
    .then(() => useCIChrome('projects/my-lib'))
    .then(() => ng('build', 'my-lib'))
    .then(() => ng('test', 'my-lib', '--watch=false', '--browsers=ChromeHeadlessCI'));
}
