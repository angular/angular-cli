import {deleteFile} from '../../utils/fs';
import {ng} from '../../utils/process';


export default function() {
  return ng('version')
    .then(() => deleteFile('angular.json'))
    // doesn't fail on a project with missing angular.json
    .then(() => ng('version'))
    // Doesn't fail outside a project.
    .then(() => process.chdir('/'))
    .then(() => ng('version'));
}
