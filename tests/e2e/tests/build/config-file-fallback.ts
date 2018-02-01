import {ng} from '../../utils/process';
import {moveFile} from '../../utils/fs';


export default function() {
  return Promise.resolve()
    .then(() => ng('build'))
    .then(() => moveFile('.angular-cli.json', 'angular-cli.json'))
    .then(() => ng('build'));
}
