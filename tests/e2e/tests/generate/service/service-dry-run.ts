import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectGitToBeClean} from '../../../utils/git';


export default function() {
  return ng('generate', 'service', 'test-service', '--module', 'app.module.ts', '--dry-run')
    .then(() => expectGitToBeClean());
}
