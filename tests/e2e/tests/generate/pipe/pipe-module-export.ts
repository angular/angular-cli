import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const modulePath = join('projects', 'test-project', 'src', 'app', 'app.module.ts');

  return ng('generate', 'pipe', 'test-pipe', '--export')
    .then(() => expectFileToMatch(modulePath, 'exports: [TestPipePipe]'))

    // Try to run the unit tests.
    .then(() => ng('test', '--watch=false'));
}
