import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const modulePath = join('src', 'app', 'app.module.ts');
  const stringToMatch = 'TestResolverResolver';

  return ng('generate', 'resolver', 'test-resolver', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(modulePath, new RegExp(stringToMatch)))
    .then(() => ng('build'));
}
