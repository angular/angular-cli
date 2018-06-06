import {ng} from '../../../utils/process';
import { expectFileToMatch } from '../../../utils/fs';
import { useCIChrome } from '../../../utils/project';


export default function() {
  return ng('generate', 'application', 'app2')
    .then(() => expectFileToMatch('angular.json', /\"app2\":/))
    .then(() => useCIChrome('projects/app2'))
    .then(() => useCIChrome('projects/app2-e2e'))
    .then(() => ng('test', 'app2', '--watch=false'));
}
