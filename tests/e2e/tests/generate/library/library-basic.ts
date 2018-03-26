import {ng} from '../../../utils/process';
import { expectFileToMatch } from '../../../utils/fs';


export default function() {
  return ng('generate', 'library', 'my-lib')
    .then(() => expectFileToMatch('angular.json', /\"my-lib\":/));

    // TODO: enable once generating Angular v6 projects
    // this is due to the service using `providedIn`
    // .then(() => useCIChrome())
    // .then(() => ng('test', 'my-lib', '--watch=false'));
}
