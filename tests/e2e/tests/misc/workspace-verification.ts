import {deleteFile} from '../../utils/fs';
import {ng} from '../../utils/process';
import { expectToFail } from '../../utils/utils';


export default function() {
  return ng('generate', 'component', 'foo', '--dry-run')
    .then(() => deleteFile('angular.json'))
    // fails because it needs to be inside a project
    // without a workspace file
    .then(() => expectToFail(() => ng('generate', 'component', 'foo', '--dry-run')))
    .then(() => ng('version'));
}
