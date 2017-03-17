import {deleteFile} from '../../utils/fs';
import {ng} from '../../utils/process';


export default function() {
  return ng('version')
    .then(() => deleteFile('.angular-cli.json'))
    // doesn't fail on a project with missing .angular-cli.json
    .then(() => ng('version'));
}
