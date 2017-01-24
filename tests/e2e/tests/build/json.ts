import {ng} from '../../utils/process';
import {expectFileToExist} from '../../utils/fs';
import {expectGitToBeClean} from '../../utils/git';


export default function() {
  return ng('build', '--stats-json')
    .then(() => expectFileToExist('./dist/stats.json'))
    .then(() => expectGitToBeClean());
}
